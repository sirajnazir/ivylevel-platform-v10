#!/usr/bin/env python3
"""
Emotional Distress Detector Training Script
Trains a binary classifier to detect emotional distress in student queries
This runs BEFORE intent classification to route distressed queries to EQ (Priority 0)
"""

import json
import pandas as pd
from sklearn.model_selection import train_test_split
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer
)
import torch
from datasets import Dataset
import numpy as np
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix

# Configuration
MODEL_NAME = "distilbert-base-uncased"
OUTPUT_DIR = "./models/emotional_distress_detector"
DATASET_PATH = "../../data/training/emotional_distress_classifier_dataset.jsonl"
MAX_LENGTH = 128
BATCH_SIZE = 16
EPOCHS = 10
LEARNING_RATE = 2e-5

def load_dataset(path):
    """Load JSONL dataset"""
    data = []
    with open(path, 'r') as f:
        for line in f:
            data.append(json.loads(line))
    return pd.DataFrame(data)

def preprocess_function(examples, tokenizer):
    """Tokenize text data"""
    return tokenizer(
        examples["text"],
        truncation=True,
        padding="max_length",
        max_length=MAX_LENGTH
    )

def compute_metrics(pred):
    """Compute accuracy, precision, recall, F1"""
    labels = pred.label_ids
    preds = pred.predictions.argmax(-1)

    accuracy = accuracy_score(labels, preds)
    precision, recall, f1, _ = precision_recall_fscore_support(
        labels, preds, average='binary'
    )

    # Confusion matrix
    tn, fp, fn, tp = confusion_matrix(labels, preds).ravel()

    return {
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1': f1,
        'true_positives': int(tp),
        'true_negatives': int(tn),
        'false_positives': int(fp),
        'false_negatives': int(fn)
    }

def main():
    print("=" * 80)
    print("EMOTIONAL DISTRESS DETECTOR TRAINING")
    print("=" * 80)
    print()

    # Load data
    print("Loading dataset...")
    df = load_dataset(DATASET_PATH)
    print(f"Total examples: {len(df)}")
    print(f"Distress (label=1): {len(df[df['label'] == 1])} ({len(df[df['label'] == 1])/len(df)*100:.1f}%)")
    print(f"No distress (label=0): {len(df[df['label'] == 0])} ({len(df[df['label'] == 0])/len(df)*100:.1f}%)")
    print()

    # Split data
    train_df, eval_df = train_test_split(df, test_size=0.2, random_state=42, stratify=df['label'])
    print(f"Training examples: {len(train_df)}")
    print(f"Evaluation examples: {len(eval_df)}")
    print()

    # Convert to HuggingFace Dataset
    train_dataset = Dataset.from_pandas(train_df[['text', 'label']])
    eval_dataset = Dataset.from_pandas(eval_df[['text', 'label']])

    # Load tokenizer and model
    print(f"Loading tokenizer and model: {MODEL_NAME}")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForSequenceClassification.from_pretrained(
        MODEL_NAME,
        num_labels=2
    )

    # Tokenize datasets
    print("Tokenizing datasets...")
    train_dataset = train_dataset.map(
        lambda x: preprocess_function(x, tokenizer),
        batched=True
    )
    eval_dataset = eval_dataset.map(
        lambda x: preprocess_function(x, tokenizer),
        batched=True
    )

    # Training arguments
    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        learning_rate=LEARNING_RATE,
        per_device_train_batch_size=BATCH_SIZE,
        per_device_eval_batch_size=BATCH_SIZE,
        num_train_epochs=EPOCHS,
        weight_decay=0.01,
        load_best_model_at_end=True,
        metric_for_best_model="f1",
        push_to_hub=False,
        logging_dir=f"{OUTPUT_DIR}/logs",
        logging_steps=10,
        save_total_limit=3
    )

    # Trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        tokenizer=tokenizer,
        compute_metrics=compute_metrics
    )

    # Train
    print()
    print("=" * 80)
    print("TRAINING")
    print("=" * 80)
    trainer.train()

    # Evaluate
    print()
    print("=" * 80)
    print("FINAL EVALUATION")
    print("=" * 80)
    results = trainer.evaluate()

    print()
    print("Results:")
    for key, value in results.items():
        print(f"  {key}: {value}")

    # Save model
    print()
    print(f"Saving model to {OUTPUT_DIR}")
    trainer.save_model(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)

    # Test on sample queries
    print()
    print("=" * 80)
    print("SAMPLE PREDICTIONS")
    print("=" * 80)

    test_queries = [
        "I got rejected from Stanford",  # Should be 1 (distress)
        "What are my SAT scores?",       # Should be 0 (factual)
        "I'm so stressed about essays",  # Should be 1 (distress)
        "Show me my college list",       # Should be 0 (factual)
        "I have 5 apps due tomorrow",    # Should be 1 (implicit distress)
        "I just got into MIT!",          # Should be 0 (celebration)
        "Help",                          # Should be 1 (crisis)
        "My SAT scores are too low"      # Should be 1 (implicit distress)
    ]

    model.eval()
    for query in test_queries:
        inputs = tokenizer(query, return_tensors="pt", truncation=True, max_length=MAX_LENGTH)
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            predicted_class = logits.argmax(-1).item()
            confidence = torch.softmax(logits, dim=1)[0][predicted_class].item()

        label_str = "DISTRESS" if predicted_class == 1 else "NO DISTRESS"
        print(f"Query: \"{query}\"")
        print(f"  → Prediction: {label_str} (confidence: {confidence:.3f})")
        print()

    print("=" * 80)
    print("TRAINING COMPLETE")
    print("=" * 80)
    print(f"Model saved to: {OUTPUT_DIR}")
    print(f"Accuracy: {results['eval_accuracy']:.3f}")
    print(f"Precision: {results['eval_precision']:.3f}")
    print(f"Recall: {results['eval_recall']:.3f}")
    print(f"F1 Score: {results['eval_f1']:.3f}")
    print()
    print("Next steps:")
    print("1. Integrate this model into intentRouter.ts as PRIORITY 0 gate")
    print("2. If distress detected → route to EQ (compose-eq.ts)")
    print("3. If no distress → proceed to keyword-based SQL/KB routing")

if __name__ == "__main__":
    main()
