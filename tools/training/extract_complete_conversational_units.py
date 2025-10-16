#!/usr/bin/env python3
"""
Complete Conversational Unit Extraction for jenny_v10_eq Training

Extracts COMPLETE conversational units from iMessage threads:
- 2-3 messages BEFORE (conversational context)
- Student query message
- Jenny response message (primary training target)
- 1-2 messages AFTER (action follow-up)

This fixes jenny_v9_eq's missing warmth/action by capturing complete exchanges.
"""

import json
import os
from typing import List, Dict, Tuple
from datetime import datetime

# Path to original iMessage conversation data
IMESSAGE_DATA_PATH = "/Users/snazir/ivylevel-platform-v10/data/raw/imessage_jenny_huda_conversations.json"
OUTPUT_PATH = "/Users/snazir/ivylevel-platform-v10/data/training/jenny_v10_eq_complete_units.jsonl"
MIN_CONTEXT_MESSAGES = 1  # At least 1 message before for context
MAX_CONTEXT_MESSAGES = 3  # Up to 3 messages before
MIN_FOLLOWUP_MESSAGES = 0  # At least 0 follow-up (optional)
MAX_FOLLOWUP_MESSAGES = 2  # Up to 2 follow-up messages

def load_imessage_data(path: str) -> List[Dict]:
    """Load iMessage conversation data from JSON"""
    with open(path, 'r') as f:
        return json.load(f)

def is_jenny_message(msg: Dict) -> bool:
    """Check if message is from Jenny"""
    sender = msg.get('sender', '').lower()
    return 'jenny' in sender or msg.get('is_counselor', False)

def is_student_message(msg: Dict) -> bool:
    """Check if message is from student"""
    return not is_jenny_message(msg)

def has_emotional_content(text: str) -> bool:
    """Check if message contains emotional content (warmth, empathy, action)"""
    emotional_markers = [
        # Warmth openers
        "i hear you", "i'm so sorry", "that's tough", "i understand",
        "i can imagine", "that's so rough", "ugh,", "that's frustrating",
        "i'm here", "you're not alone", "totally normal",

        # Action guidance
        "let's", "here's what", "next step", "first priority", "focus on",
        "what do you want to do", "does this feel", "what's most",

        # Crisis support
        "breathe", "we'll figure", "one step at a time", "together",

        # Celebration
        "congratulations", "congrats", "amazing", "incredible", "so proud",
        "well done", "you did it"
    ]
    text_lower = text.lower()
    return any(marker in text_lower for marker in emotional_markers)

def has_action_guidance(text: str) -> bool:
    """Check if message contains action guidance"""
    action_markers = [
        "let's", "next step", "first", "priority", "focus on", "start with",
        "what do you want to do", "here's the plan", "does this feel",
        "what's most urgent", "which schools", "what specific part"
    ]
    text_lower = text.lower()
    return any(marker in text_lower for marker in action_markers)

def extract_conversational_unit(
    messages: List[Dict],
    student_idx: int
) -> Tuple[List[Dict], Dict, Dict, List[Dict]]:
    """
    Extract a complete conversational unit around a student query

    Returns:
        (context_before, student_query, jenny_response, followup_messages)
    """
    # Get context before (1-3 messages)
    context_start = max(0, student_idx - MAX_CONTEXT_MESSAGES)
    context_before = messages[context_start:student_idx]

    # Get student query
    student_query = messages[student_idx]

    # Get Jenny's immediate response (next message should be from Jenny)
    jenny_response = None
    response_idx = student_idx + 1
    if response_idx < len(messages) and is_jenny_message(messages[response_idx]):
        jenny_response = messages[response_idx]

    # Get follow-up messages (up to 2 more messages)
    followup_messages = []
    if jenny_response:
        followup_start = response_idx + 1
        followup_end = min(len(messages), followup_start + MAX_FOLLOWUP_MESSAGES)
        followup_messages = messages[followup_start:followup_end]

    return context_before, student_query, jenny_response, followup_messages

def should_include_unit(
    context: List[Dict],
    query: Dict,
    response: Dict,
    followup: List[Dict]
) -> bool:
    """Determine if conversational unit should be included in training data"""

    # Must have Jenny response
    if not response:
        return False

    # Response must have meaningful content (not just "ok" or emoji)
    response_text = response.get('text', '').strip()
    if len(response_text) < 10:  # Too short
        return False

    # Query must have meaningful content
    query_text = query.get('text', '').strip()
    if len(query_text) < 3:  # Too short
        return False

    # Prefer units with emotional content or action guidance
    response_has_warmth = has_emotional_content(response_text)
    response_has_action = has_action_guidance(response_text)

    # Check follow-up for action if main response lacks it
    followup_has_action = any(has_action_guidance(msg.get('text', ''))
                               for msg in followup if is_jenny_message(msg))

    # Include if response has warmth OR action (in response or follow-up)
    return response_has_warmth or response_has_action or followup_has_action

def merge_response_with_followup(response: Dict, followup: List[Dict]) -> str:
    """
    Merge Jenny's immediate response with follow-up action messages
    This creates COMPLETE responses with warmth + action
    """
    parts = [response.get('text', '').strip()]

    # Add follow-up Jenny messages (action guidance)
    for msg in followup:
        if is_jenny_message(msg):
            text = msg.get('text', '').strip()
            if text and len(text) > 5:  # Meaningful follow-up
                parts.append(text)

    return '\n\n'.join(parts)

def format_context_messages(context: List[Dict]) -> str:
    """Format context messages as conversation history"""
    if not context:
        return ""

    lines = []
    for msg in context:
        sender = "Jenny" if is_jenny_message(msg) else "Student"
        text = msg.get('text', '').strip()
        lines.append(f"{sender}: {text}")

    return '\n'.join(lines)

def create_training_example(
    context: List[Dict],
    query: Dict,
    response: Dict,
    followup: List[Dict],
    unit_id: int
) -> Dict:
    """Create OpenAI fine-tuning format training example"""

    # Merge response with follow-up for COMPLETE response
    complete_response = merge_response_with_followup(response, followup)

    # Format context
    context_str = format_context_messages(context)

    # Create system message with context
    system_content = (
        "You are Jenny, a supportive college admissions coach. "
        "You provide warm, empathetic, and actionable guidance to students. "
        "Always start with emotional acknowledgment, then provide concrete next steps."
    )

    if context_str:
        system_content += f"\n\nConversation history:\n{context_str}"

    # Create training example in OpenAI format
    training_example = {
        "messages": [
            {"role": "system", "content": system_content},
            {"role": "user", "content": query.get('text', '').strip()},
            {"role": "assistant", "content": complete_response}
        ]
    }

    # Metadata for analysis
    metadata = {
        "unit_id": unit_id,
        "query_length": len(query.get('text', '')),
        "response_length": len(complete_response),
        "context_messages": len(context),
        "followup_messages": len(followup),
        "has_warmth": has_emotional_content(complete_response),
        "has_action": has_action_guidance(complete_response),
        "timestamp": query.get('timestamp', ''),
        "student_id": query.get('student_id', 'unknown')
    }

    return {
        "training_example": training_example,
        "metadata": metadata
    }

def main():
    print("=" * 80)
    print("COMPLETE CONVERSATIONAL UNIT EXTRACTION")
    print("jenny_v10_eq Training Data Generation")
    print("=" * 80)
    print()

    # Check if input file exists
    if not os.path.exists(IMESSAGE_DATA_PATH):
        print(f"ERROR: iMessage data file not found: {IMESSAGE_DATA_PATH}")
        print()
        print("This script requires original iMessage conversation data.")
        print("Expected format: JSON array of message objects with:")
        print("  - text: message content")
        print("  - sender: 'Jenny' or student name")
        print("  - timestamp: ISO timestamp")
        print("  - student_id: student identifier")
        print()
        print("Placeholder mode: Creating sample structure...")

        # Create sample structure for now
        sample_data = [{
            "text": "I got rejected from Stanford",
            "sender": "student",
            "timestamp": "2024-03-15T10:30:00Z",
            "student_id": "huda-2025"
        }, {
            "text": "I'm so sorry to hear that, Huda. I can imagine how tough this feels right now. Remember, this is one decision from one school—it doesn't define your worth or your future.",
            "sender": "Jenny",
            "timestamp": "2024-03-15T10:31:00Z",
            "student_id": "huda-2025"
        }, {
            "text": "Let's focus on your remaining applications. USC and UCLA are still strong options. What schools are you most excited about?",
            "sender": "Jenny",
            "timestamp": "2024-03-15T10:31:30Z",
            "student_id": "huda-2025"
        }]

        with open(IMESSAGE_DATA_PATH, 'w') as f:
            json.dump(sample_data, f, indent=2)

        print(f"Created sample data at: {IMESSAGE_DATA_PATH}")
        print("Please replace with actual iMessage conversation data.")
        print()

    # Load data
    print(f"Loading iMessage data from: {IMESSAGE_DATA_PATH}")
    conversations = load_imessage_data(IMESSAGE_DATA_PATH)
    print(f"Total messages loaded: {len(conversations)}")
    print()

    # Extract conversational units
    print("Extracting complete conversational units...")
    training_examples = []
    skipped = 0

    for i, msg in enumerate(conversations):
        # Only process student messages (queries)
        if not is_student_message(msg):
            continue

        # Extract unit
        context, query, response, followup = extract_conversational_unit(conversations, i)

        # Check if should include
        if not should_include_unit(context, query, response, followup):
            skipped += 1
            continue

        # Create training example
        example = create_training_example(context, query, response, followup, len(training_examples) + 1)
        training_examples.append(example)

    print(f"Extracted units: {len(training_examples)}")
    print(f"Skipped: {skipped}")
    print()

    # Analyze dataset
    print("=" * 80)
    print("DATASET ANALYSIS")
    print("=" * 80)

    total_with_warmth = sum(1 for ex in training_examples if ex['metadata']['has_warmth'])
    total_with_action = sum(1 for ex in training_examples if ex['metadata']['has_action'])
    total_with_both = sum(1 for ex in training_examples
                          if ex['metadata']['has_warmth'] and ex['metadata']['has_action'])

    print(f"Total training examples: {len(training_examples)}")
    print(f"With warmth: {total_with_warmth} ({total_with_warmth/len(training_examples)*100:.1f}%)")
    print(f"With action: {total_with_action} ({total_with_action/len(training_examples)*100:.1f}%)")
    print(f"With both: {total_with_both} ({total_with_both/len(training_examples)*100:.1f}%)")
    print()

    # Save training data in OpenAI JSONL format
    print(f"Saving training data to: {OUTPUT_PATH}")
    with open(OUTPUT_PATH, 'w') as f:
        for example in training_examples:
            # Write only the training example (not metadata) to JSONL
            f.write(json.dumps(example['training_example']) + '\n')

    # Save metadata separately for analysis
    metadata_path = OUTPUT_PATH.replace('.jsonl', '_metadata.json')
    with open(metadata_path, 'w') as f:
        metadata_list = [ex['metadata'] for ex in training_examples]
        json.dump(metadata_list, f, indent=2)

    print(f"Saved metadata to: {metadata_path}")
    print()

    print("=" * 80)
    print("EXTRACTION COMPLETE")
    print("=" * 80)
    print()
    print("Next steps:")
    print("1. Review training data quality in:", OUTPUT_PATH)
    print("2. Validate warmth/action coverage meets targets (>80%)")
    print("3. If quality good, proceed to jenny_v10_eq training")
    print("4. Upload to OpenAI:")
    print(f"   openai api fine_tunes.create -t {OUTPUT_PATH} -m gpt-4o-mini-2024-07-18")

if __name__ == "__main__":
    main()
