#!/usr/bin/env python3
"""
v8.0: Fine-tune LLM Adapter v2
Train jenny-4o-tuned-v8 on ToneCue, TrustCue, PlanGen, ProofLink datasets
"""

import os
import json
import argparse
from typing import List, Dict
from openai import OpenAI

client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

FINE_TUNE_CONFIG = {
    "base_model": "gpt-4o-mini-2024-07-18",
    "target_model": "jenny-4o-tuned-v8",
    "learning_rate": 2e-5,
    "epochs": 3,
    "batch_size": 16,
}

def prepare_training_file(dataset_path: str, output_path: str) -> str:
    """Convert JSONL dataset to OpenAI fine-tuning format (or pass through if already formatted)"""
    print(f"Preparing training file: {dataset_path}")

    training_examples = []

    with open(dataset_path, 'r') as f:
        for line in f:
            item = json.loads(line)

            # Check if already in OpenAI format (has messages array)
            if 'messages' in item:
                # Already formatted - pass through, just remove metadata
                example = {"messages": item["messages"]}
                training_examples.append(example)
            # Legacy format handling (for old datasets)
            elif 'content' in item and 'tone_label' in item:
                # ToneCue format
                example = {
                    "messages": [
                        {"role": "system", "content": "You are Jenny, an empathetic college admissions coach with warm, encouraging tone."},
                        {"role": "user", "content": "Respond with appropriate tone: " + item.get('content', '')[:500]},
                        {"role": "assistant", "content": item.get('content', '')},
                    ]
                }
                training_examples.append(example)
            elif 'interaction_sequence' in item:
                # TrustCue format
                messages = json.loads(item['interaction_sequence']) if isinstance(item['interaction_sequence'], str) else item['interaction_sequence']
                example = {"messages": messages}
                training_examples.append(example)
            elif 'chip_type' in item.get('metadata', {}):
                # PlanGen format
                example = {
                    "messages": [
                        {"role": "system", "content": "You are Jenny, an expert college admissions strategist."},
                        {"role": "user", "content": "Create a strategic plan for: " + item.get('content', '')[:200]},
                        {"role": "assistant", "content": item.get('content', '')},
                    ]
                }
                training_examples.append(example)
            else:
                # ProofLink format
                example = {
                    "messages": [
                        {"role": "system", "content": "You are Jenny. Always provide verifiable evidence with citations."},
                        {"role": "user", "content": "Answer with proof: " + item.get('content', '')[:200]},
                        {"role": "assistant", "content": f"<evidence id=\"{item.get('chip_id', 'unknown')}\">{item.get('content', '')}</evidence>"},
                    ]
                }
                training_examples.append(example)

    # Write to output file
    with open(output_path, 'w') as f:
        for example in training_examples:
            f.write(json.dumps(example) + '\n')

    print(f"✓ Prepared {len(training_examples)} training examples → {output_path}")
    return output_path

def upload_training_file(file_path: str) -> str:
    """Upload training file to OpenAI"""
    print(f"Uploading training file: {file_path}")

    with open(file_path, 'rb') as f:
        response = client.files.create(
            file=f,
            purpose='fine-tune'
        )

    print(f"✓ Uploaded file: {response.id}")
    return response.id

def create_fine_tune_job(file_id: str, suffix: str = "v8", seed: int = None) -> str:
    """Create fine-tuning job"""
    print("Creating fine-tune job...")

    params = {
        "training_file": file_id,
        "model": FINE_TUNE_CONFIG['base_model'],
        "hyperparameters": {
            "n_epochs": FINE_TUNE_CONFIG['epochs'],
            "batch_size": FINE_TUNE_CONFIG['batch_size'],
            "learning_rate_multiplier": FINE_TUNE_CONFIG['learning_rate'] / 1e-5,  # OpenAI uses multiplier
        },
        "suffix": suffix,
    }

    if seed is not None:
        params["seed"] = seed

    response = client.fine_tuning.jobs.create(**params)

    print(f"✓ Fine-tune job created: {response.id}")
    print(f"  Status: {response.status}")
    print(f"  Model: {response.model}")

    return response.id

def check_job_status(job_id: str):
    """Check fine-tuning job status"""
    response = client.fine_tuning.jobs.retrieve(job_id)

    print(f"\nJob: {job_id}")
    print(f"Status: {response.status}")
    print(f"Model: {response.fine_tuned_model or 'Pending...'}")

    if response.trained_tokens:
        print(f"Trained tokens: {response.trained_tokens}")

    if response.status == 'succeeded':
        print(f"\n✓ Fine-tuning complete!")
        print(f"  Model ID: {response.fine_tuned_model}")
        print(f"\nValidation metrics:")
        if hasattr(response, 'result_files') and response.result_files:
            for file_id in response.result_files:
                print(f"  - {file_id}")

    return response

def main():
    parser = argparse.ArgumentParser(description='Fine-tune LLM Adapter v2')
    parser.add_argument('--datasets', nargs='+', help='Training dataset paths (JSONL)')
    parser.add_argument('--output_dir', default='./data/training/prepared', help='Output directory for prepared files')
    parser.add_argument('--suffix', default='v8', help='Model suffix')
    parser.add_argument('--seed', type=int, help='Random seed for reproducibility')
    parser.add_argument('--check_status', help='Check status of existing job ID')
    parser.add_argument('--dry_run', action='store_true', help='Prepare files but do not upload/train')

    args = parser.parse_args()

    # Check status only
    if args.check_status:
        check_job_status(args.check_status)
        return

    # Validate datasets required for training
    if not args.datasets:
        parser.error('--datasets is required when not checking status')

    print("v8.0 LLM Adapter Fine-Tuning")
    print("=" * 50)
    print(f"Base model: {FINE_TUNE_CONFIG['base_model']}")
    print(f"Epochs: {FINE_TUNE_CONFIG['epochs']}")
    print(f"Batch size: {FINE_TUNE_CONFIG['batch_size']}")
    print(f"Learning rate: {FINE_TUNE_CONFIG['learning_rate']}")
    print()

    os.makedirs(args.output_dir, exist_ok=True)

    # Prepare all datasets
    prepared_files = []
    for dataset_path in args.datasets:
        base_name = os.path.basename(dataset_path).replace('.jsonl', '')
        output_path = os.path.join(args.output_dir, f'{base_name}_prepared.jsonl')

        prepared_path = prepare_training_file(dataset_path, output_path)
        prepared_files.append(prepared_path)

    # Merge all prepared files
    merged_path = os.path.join(args.output_dir, 'merged_training.jsonl')
    print(f"\nMerging {len(prepared_files)} files → {merged_path}")

    with open(merged_path, 'w') as outfile:
        for prepared_file in prepared_files:
            with open(prepared_file, 'r') as infile:
                outfile.write(infile.read())

    print(f"✓ Merged training file ready: {merged_path}")

    if args.dry_run:
        print("\n[DRY RUN] Stopping before upload/training")
        return

    # Upload and create fine-tune job
    file_id = upload_training_file(merged_path)
    job_id = create_fine_tune_job(file_id, args.suffix, seed=args.seed)

    print("\n" + "=" * 50)
    print("Fine-tuning job started!")
    print(f"Job ID: {job_id}")
    print(f"\nCheck status with:")
    print(f"  python scripts/finetune_adapter.py --check_status {job_id}")
    print(f"\nOr monitor at: https://platform.openai.com/finetune/{job_id}")

if __name__ == '__main__':
    main()
