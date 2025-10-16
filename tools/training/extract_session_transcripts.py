#!/usr/bin/env python3
"""
Session Transcript Extraction for jenny_v10_eq Training

Extracts COMPLETE conversational units from WEBVTT session transcript PDFs:
- Parses speaker-labeled dialogue (Jenny Duan: / huda:)
- Groups conversational turns into complete exchanges
- Applies complete unit pattern: 2-3 before + query + response + 1-2 after
- Merges Jenny's multi-turn responses into complete coaching responses

Expected output: 400-900 training examples from 93 session transcripts
"""

import json
import os
import re
from pathlib import Path
from typing import List, Dict, Tuple
from datetime import datetime
import PyPDF2

# Paths
TRANSCRIPTS_DIR = "/Users/snazir/ivylevel-platform-v10/archive/2025-10-09-deep-cleanup/data/raw/jenny-huda/03-Raw-SessionTranscripts"
OUTPUT_PATH = "/Users/snazir/ivylevel-platform-v10/data/training/jenny_v10_eq_session_transcripts.jsonl"

# Configuration
MIN_CONTEXT_MESSAGES = 1  # At least 1 message before for context
MAX_CONTEXT_MESSAGES = 3  # Up to 3 messages before
MIN_FOLLOWUP_MESSAGES = 0  # At least 0 follow-up (optional)
MAX_FOLLOWUP_MESSAGES = 2  # Up to 2 follow-up messages
MIN_RESPONSE_LENGTH = 15  # Minimum meaningful response length
MIN_QUERY_LENGTH = 5      # Minimum meaningful query length

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract raw text from PDF file"""
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text
    except Exception as e:
        print(f"Error reading {pdf_path}: {e}")
        return ""

def parse_webvtt_transcript(text: str) -> List[Dict]:
    """
    Parse WEBVTT format transcript into structured messages

    PDFs extract with each word on separate line:
    - Timestamp is 3 words: "00:02:03.990" "-->" "00:02:10.229"
    - Speaker is 2 words: "Jenny" "Duan:" or 1 word: "huda:"
    - Text follows until next block number
    """
    messages = []
    words = [w.strip() for w in text.split('\n') if w.strip()]

    i = 0
    while i < len(words):
        # Skip WEBVTT header and single-digit block numbers
        if words[i] == "WEBVTT" or (words[i].isdigit() and len(words[i]) <= 3):
            i += 1
            continue

        # Look for timestamp arrow (middle of timestamp line)
        if i < len(words) and words[i] == "-->":
            # Skip the end timestamp (next word)
            i += 2  # Skip "-->" and end time

            if i >= len(words):
                break

            # Next should be speaker label
            speaker = None

            # Check for "Jenny Duan:" pattern (2 words)
            if i < len(words) - 1 and words[i].lower() == "jenny" and "duan" in words[i+1].lower():
                speaker = "Jenny"
                i += 2  # Skip "Jenny" and "Duan:"
            # Check for "huda:" pattern (1 word)
            elif i < len(words) and "huda" in words[i].lower():
                speaker = "Huda"
                i += 1  # Skip "huda:"

            if not speaker:
                i += 1
                continue

            # Collect text until next block number (single/double/triple digit)
            text_words = []
            while i < len(words):
                # Stop at next block number (but not timestamps which have colons)
                if words[i].isdigit() and len(words[i]) <= 3 and ":" not in words[i]:
                    break
                # Stop at next timestamp start
                if ":" in words[i] and re.match(r'\d+:\d+:\d+', words[i]):
                    break

                text_words.append(words[i])
                i += 1

            # Create message
            if text_words:
                message_text = " ".join(text_words).strip()

                if len(message_text) > 0:
                    messages.append({
                        "sender": speaker,
                        "text": message_text,
                        "timestamp": ""  # We could reconstruct if needed
                    })
        else:
            i += 1

    return messages

def normalize_speaker(sender: str) -> str:
    """Normalize speaker names"""
    sender_lower = sender.lower()
    if 'jenny' in sender_lower:
        return "Jenny"
    elif 'huda' in sender_lower:
        return "Huda"
    return sender

def is_jenny_message(msg: Dict) -> bool:
    """Check if message is from Jenny"""
    return normalize_speaker(msg.get('sender', '')) == "Jenny"

def is_student_message(msg: Dict) -> bool:
    """Check if message is from student (Huda)"""
    return normalize_speaker(msg.get('sender', '')) == "Huda"

def has_emotional_content(text: str) -> bool:
    """Check if message contains emotional content (warmth, empathy, action)"""
    emotional_markers = [
        # Warmth openers
        "i hear you", "i'm so sorry", "that's tough", "i understand",
        "i can imagine", "that's so rough", "ugh,", "that's frustrating",
        "i'm here", "you're not alone", "totally normal", "that's so cool",
        "i'm really happy", "so proud", "amazing", "incredible",

        # Action guidance
        "let's", "here's what", "next step", "first priority", "focus on",
        "what do you want to do", "does this feel", "what's most",
        "maybe you can", "you should", "have you tried",

        # Crisis support
        "breathe", "we'll figure", "one step at a time", "together",
        "you've got this",

        # Celebration
        "congratulations", "congrats", "well done", "you did it",
        "that's awesome", "love it", "great job"
    ]
    text_lower = text.lower()
    return any(marker in text_lower for marker in emotional_markers)

def has_action_guidance(text: str) -> bool:
    """Check if message contains action guidance"""
    action_markers = [
        "let's", "next step", "first", "priority", "focus on", "start with",
        "what do you want to do", "here's the plan", "does this feel",
        "what's most urgent", "which schools", "what specific part",
        "maybe you can", "you should", "have you tried", "can you",
        "why don't you", "what if you", "brainstorm", "think about"
    ]
    text_lower = text.lower()
    return any(marker in text_lower for marker in action_markers)

def merge_consecutive_jenny_messages(messages: List[Dict]) -> List[Dict]:
    """
    Merge consecutive Jenny messages into single responses
    This captures complete coaching responses that span multiple turns
    """
    merged = []
    i = 0

    while i < len(messages):
        current = messages[i]

        # If Jenny message, look ahead for more consecutive Jenny messages
        if is_jenny_message(current):
            jenny_texts = [current['text']]
            j = i + 1

            # Collect consecutive Jenny messages
            while j < len(messages) and is_jenny_message(messages[j]):
                jenny_texts.append(messages[j]['text'])
                j += 1

            # Merge into single message
            merged.append({
                "sender": normalize_speaker(current['sender']),
                "text": "\n\n".join(jenny_texts),
                "timestamp": current['timestamp']
            })

            i = j  # Skip merged messages
        else:
            # Student message, keep as is
            merged.append({
                "sender": normalize_speaker(current['sender']),
                "text": current['text'],
                "timestamp": current['timestamp']
            })
            i += 1

    return merged

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

    # Response must have meaningful content
    response_text = response.get('text', '').strip()
    if len(response_text) < MIN_RESPONSE_LENGTH:
        return False

    # Query must have meaningful content
    query_text = query.get('text', '').strip()
    if len(query_text) < MIN_QUERY_LENGTH:
        return False

    # Skip if query or response contains only timestamps/formatting
    if re.match(r'^[\d:.\->\s]+$', query_text) or re.match(r'^[\d:.\->\s]+$', response_text):
        return False

    # Skip very short responses (just acknowledgments like "yeah", "hmm", "okay")
    if len(response_text.split()) < 5:
        return False

    # For session transcripts, we're more lenient - include any substantive coaching exchange
    # We don't strictly require emotional markers since real coaching is naturally empathetic

    # Check for warmth or action in response or follow-up
    response_has_warmth = has_emotional_content(response_text)
    response_has_action = has_action_guidance(response_text)
    followup_has_action = any(has_action_guidance(msg.get('text', ''))
                               for msg in followup if is_jenny_message(msg))

    # Include if:
    # 1. Response has warmth OR action
    # 2. OR response is substantive (>20 words) and sounds like coaching
    is_substantive = len(response_text.split()) > 20

    return (response_has_warmth or response_has_action or followup_has_action or is_substantive)

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
        sender = normalize_speaker(msg['sender'])
        text = msg.get('text', '').strip()
        if text:
            lines.append(f"{sender}: {text}")

    return '\n'.join(lines)

def create_training_example(
    context: List[Dict],
    query: Dict,
    response: Dict,
    followup: List[Dict],
    unit_id: int,
    session_name: str
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
        "session_name": session_name,
        "query_length": len(query.get('text', '')),
        "response_length": len(complete_response),
        "context_messages": len(context),
        "followup_messages": len(followup),
        "has_warmth": has_emotional_content(complete_response),
        "has_action": has_action_guidance(complete_response),
        "timestamp": query.get('timestamp', ''),
        "student_id": "huda-2025"
    }

    return {
        "training_example": training_example,
        "metadata": metadata
    }

def process_session_transcript(pdf_path: str, session_name: str) -> List[Dict]:
    """Process a single session transcript PDF"""
    print(f"Processing: {session_name}...")

    # Extract text from PDF
    text = extract_text_from_pdf(pdf_path)
    if not text:
        print(f"  ⚠️  No text extracted from {session_name}")
        return []

    # Parse WEBVTT format
    messages = parse_webvtt_transcript(text)
    if not messages:
        print(f"  ⚠️  No messages parsed from {session_name}")
        return []

    # Merge consecutive Jenny messages
    messages = merge_consecutive_jenny_messages(messages)

    print(f"  Parsed {len(messages)} conversational turns")

    # Extract conversational units
    training_examples = []
    skipped = 0

    for i, msg in enumerate(messages):
        # Only process student messages (queries)
        if not is_student_message(msg):
            continue

        # Extract unit
        context, query, response, followup = extract_conversational_unit(messages, i)

        # Check if should include
        if not should_include_unit(context, query, response, followup):
            skipped += 1
            continue

        # Create training example
        example = create_training_example(
            context, query, response, followup,
            len(training_examples) + 1,
            session_name
        )
        training_examples.append(example)

    print(f"  ✅ Extracted {len(training_examples)} units (skipped {skipped})")
    return training_examples

def main():
    print("=" * 80)
    print("SESSION TRANSCRIPT EXTRACTION FOR jenny_v10_eq")
    print("=" * 80)
    print()
    print(f"Source: {TRANSCRIPTS_DIR}")
    print(f"Output: {OUTPUT_PATH}")
    print()

    # Check if transcripts directory exists
    if not os.path.exists(TRANSCRIPTS_DIR):
        print(f"ERROR: Transcripts directory not found: {TRANSCRIPTS_DIR}")
        return

    # Get all PDF files
    pdf_files = sorted(Path(TRANSCRIPTS_DIR).glob("*.pdf"))
    print(f"Found {len(pdf_files)} PDF transcripts")
    print()

    # Process each transcript
    all_training_examples = []
    session_stats = {}

    for pdf_path in pdf_files:
        session_name = pdf_path.stem
        examples = process_session_transcript(str(pdf_path), session_name)

        if examples:
            all_training_examples.extend(examples)
            session_stats[session_name] = len(examples)

    print()
    print("=" * 80)
    print("EXTRACTION SUMMARY")
    print("=" * 80)
    print(f"Total sessions processed: {len(pdf_files)}")
    print(f"Sessions with training data: {len(session_stats)}")
    print(f"Total training examples: {len(all_training_examples)}")
    print()

    # Analyze dataset quality
    if all_training_examples:
        total_with_warmth = sum(1 for ex in all_training_examples if ex['metadata']['has_warmth'])
        total_with_action = sum(1 for ex in all_training_examples if ex['metadata']['has_action'])
        total_with_both = sum(1 for ex in all_training_examples
                              if ex['metadata']['has_warmth'] and ex['metadata']['has_action'])

        print("QUALITY METRICS:")
        print(f"  Warmth coverage: {total_with_warmth}/{len(all_training_examples)} ({total_with_warmth/len(all_training_examples)*100:.1f}%)")
        print(f"  Action coverage: {total_with_action}/{len(all_training_examples)} ({total_with_action/len(all_training_examples)*100:.1f}%)")
        print(f"  Both warmth + action: {total_with_both}/{len(all_training_examples)} ({total_with_both/len(all_training_examples)*100:.1f}%)")
        print()

        # Save training data in OpenAI JSONL format
        print(f"Saving training data to: {OUTPUT_PATH}")
        with open(OUTPUT_PATH, 'w') as f:
            for example in all_training_examples:
                # Write only the training example (not metadata) to JSONL
                f.write(json.dumps(example['training_example']) + '\n')

        # Save metadata separately for analysis
        metadata_path = OUTPUT_PATH.replace('.jsonl', '_metadata.json')
        with open(metadata_path, 'w') as f:
            metadata_list = [ex['metadata'] for ex in all_training_examples]
            json.dump(metadata_list, f, indent=2)

        print(f"Saved metadata to: {metadata_path}")
        print()

        # Save session-level statistics
        stats_path = OUTPUT_PATH.replace('.jsonl', '_session_stats.json')
        with open(stats_path, 'w') as f:
            json.dump(session_stats, f, indent=2, sort_keys=True)

        print(f"Saved session stats to: {stats_path}")
        print()

        print("=" * 80)
        print("EXTRACTION COMPLETE")
        print("=" * 80)
        print()
        print("✅ SUCCESS: Dataset ready for jenny_v10_eq training")
        print()
        print("Next steps:")
        print("1. Review training data quality in:", OUTPUT_PATH)
        print("2. Validate warmth/action coverage meets targets (>80% / >75%)")
        print("3. Proceed to jenny_v10_eq training:")
        print(f"   openai api fine_tunes.create -t {OUTPUT_PATH} -m gpt-4o-mini-2024-07-18 --suffix jenny-v10-eq")
    else:
        print("⚠️  WARNING: No training examples extracted")
        print("Check PDF format and parsing logic")

if __name__ == "__main__":
    main()
