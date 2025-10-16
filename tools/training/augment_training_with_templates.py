#!/usr/bin/env python3
"""
Training Data Augmentation with Warmth/Action Templates

For existing training examples that lack warmth openers or action guidance,
this script augments them with appropriate templates while preserving Jenny's voice.

Use this AFTER extract_complete_conversational_units.py if additional augmentation needed.
"""

import json
import re
from typing import Dict, List

# Warmth Opener Templates (20 templates across 5 categories)
WARMTH_TEMPLATES = {
    "rejection": [
        "I'm so sorry to hear that. I can imagine how tough this feels right now.",
        "Ugh, that's so rough. I hear you—this is really disappointing.",
        "I'm really sorry. This must be so hard to process.",
        "That's such tough news. I'm here with you through this.",
        "I hear you. Rejections are never easy, especially from schools you really wanted."
    ],
    "stress": [
        "I hear you—this sounds really overwhelming right now.",
        "That's a lot to handle. It's totally normal to feel this way.",
        "I can tell you're stressed. This is such an intense time.",
        "Ugh, I can feel the pressure just reading this. You're not alone in feeling overwhelmed.",
        "This is really tough. Totally get why you're feeling stressed."
    ],
    "self_doubt": [
        "It's totally normal to feel this way. You're not alone in having these doubts.",
        "I hear you. These thoughts are so common, but they don't define your worth.",
        "First off: these feelings are real, but they're not facts about you.",
        "I get it. Self-doubt creeps in for everyone, especially during this process.",
        "Ugh, imposter syndrome is so real. But let me remind you of something important..."
    ],
    "celebration": [
        "This is amazing news! I'm so proud of you!",
        "Congratulations!!! I'm so happy for you—this is incredible!",
        "YES!!! This is such huge news! So proud of all your hard work!",
        "I knew you could do it! This is so well-deserved!",
        "This is fantastic! What an amazing achievement!"
    ],
    "crisis": [
        "I'm here with you. Let's take this one step at a time.",
        "First: take a deep breath. You're not alone in this—we'll figure it out together.",
        "I hear you. This is really hard, and it's okay to feel overwhelmed. Let's work through this.",
        "You're safe. Let's slow down and tackle this together, okay?",
        "I'm here. What you're feeling is valid. Let's find a way through this."
    ]
}

# Action Guidance Templates (30 templates across 7 categories)
ACTION_TEMPLATES = {
    "rejection": [
        "Let's focus on your remaining applications. Which schools are you most excited about?",
        "This is one decision, not a reflection of your worth. What's your next priority right now?",
        "Let's channel this energy into schools that truly value what you bring. What's next on your list?",
        "Here's what we're doing next: taking stock of where you stand and refocusing on strong options.",
        "Want to talk through how you're feeling, or should we dive into next steps?"
    ],
    "stress": [
        "Let's break this down into one task at a time. What feels most urgent right now?",
        "First priority: [specific task]. After that, we'll tackle the next thing together.",
        "Take 10 minutes to breathe, then let's make a focused 2-hour plan for today.",
        "Here's what I'm thinking: we pick the top 2 priorities and ignore everything else for now. Sound good?",
        "What's the one thing that, if you did it today, would make you feel less overwhelmed?"
    ],
    "self_doubt": [
        "Let's ground this in facts. What are your actual accomplishments this year?",
        "Write down 3 things you've done well this week. Then we'll build from there.",
        "Compare yourself to your past self, not to others. How far have you come?",
        "Let's reframe this: what evidence do you have that contradicts this doubt?",
        "Tell me one thing you're genuinely proud of. Start there."
    ],
    "celebration": [
        "Take today to celebrate! Tomorrow, let's plan your next steps.",
        "This is huge! Now, what questions do you have about what comes next?",
        "So proud of you! Let's make sure you're ready for the next phase.",
        "Celebrate this win! When you're ready, let's talk about next moves.",
        "You earned this! What do you want to focus on now?"
    ],
    "crisis": [
        "Right now: take 5 deep breaths. Then text me back and we'll figure this out step by step.",
        "You're safe. Let's talk through this together. Start with what's making you feel worst right now.",
        "First step: tell a trusted adult how you're feeling. Second: let's make a plan together.",
        "Pause everything else. What's the one thing that would help you feel even slightly better right now?",
        "We're going to get through this together. First: are you somewhere safe? Second: who can you talk to in person?"
    ],
    "permission": [
        "Yes, absolutely. Here's what we'll prioritize when you're back: [specific list]",
        "You have my permission. Rest is productive. Check in with me on Monday.",
        "Of course! Taking care of yourself is part of the process. Go recharge.",
        "Yes—and here's why it's okay: [reason]. Come back refreshed.",
        "Absolutely. You're not falling behind by taking a break. Promise."
    ],
    "time_boxing": [
        "Next 60 minutes: [specific task]. Set a timer. Report back when done.",
        "Here's your plan: [morning block], [afternoon block], [evening block]. Let's start with morning.",
        "Focus block: 2 hours on [specific task], then 30-min break. Sound good?",
        "Let's time-box this: [task 1] by noon, [task 2] by 3pm, [task 3] by 6pm.",
        "Today's priority: [specific task]. Everything else can wait. Deal?"
    ]
}

def detect_emotional_category(query_text: str, response_text: str) -> str:
    """Detect emotional category from query and response"""

    query_lower = query_text.lower()
    response_lower = response_text.lower()

    # Check for crisis markers
    crisis_markers = ["breakdown", "can't breathe", "panic", "help", "can't do this"]
    if any(marker in query_lower for marker in crisis_markers):
        return "crisis"

    # Check for rejection markers
    rejection_markers = ["rejected", "didn't get in", "waitlist", "deferred"]
    if any(marker in query_lower for marker in rejection_markers):
        return "rejection"

    # Check for celebration markers
    celebration_markers = ["got in", "accepted", "scholarship", "won", "success"]
    if any(marker in query_lower for marker in celebration_markers):
        return "celebration"

    # Check for self-doubt markers
    doubt_markers = ["not good enough", "everyone else", "too low", "can't", "don't think i"]
    if any(marker in query_lower for marker in doubt_markers):
        return "self_doubt"

    # Check for permission markers
    permission_markers = ["can i", "is it okay", "allowed to", "should i take"]
    if any(marker in query_lower for marker in permission_markers):
        return "permission"

    # Check for time-boxing markers
    timebox_markers = ["plan my day", "first 60", "what should i do", "help me prioritize"]
    if any(marker in query_lower for marker in timebox_markers):
        return "time_boxing"

    # Default to stress
    return "stress"

def has_warmth_opener(response_text: str) -> bool:
    """Check if response already has warmth opener"""
    warmth_patterns = [
        r"^i'?m (so )?sorry",
        r"^ugh,?",
        r"^i hear you",
        r"^that'?s (so )?(tough|rough|hard|difficult)",
        r"^first off",
        r"^congratulations",
        r"^this is (amazing|incredible|huge)",
        r"^i'?m here"
    ]
    first_sentence = response_text.split('.')[0].lower().strip()
    return any(re.match(pattern, first_sentence) for pattern in warmth_patterns)

def has_action_guidance(response_text: str) -> bool:
    """Check if response already has action guidance"""
    action_markers = [
        "let's", "next step", "first", "here's what", "priority",
        "what do you want", "sound good", "does this feel",
        "which schools", "tell me", "start with"
    ]
    text_lower = response_text.lower()
    return any(marker in text_lower for marker in action_markers)

def augment_response(
    query_text: str,
    response_text: str,
    category: str
) -> str:
    """Augment response with warmth/action if missing"""

    needs_warmth = not has_warmth_opener(response_text)
    needs_action = not has_action_guidance(response_text)

    if not needs_warmth and not needs_action:
        return response_text  # Already complete

    parts = []

    # Add warmth opener if needed
    if needs_warmth and category in WARMTH_TEMPLATES:
        warmth = WARMTH_TEMPLATES[category][0]  # Use first template
        parts.append(warmth)

    # Add original response
    parts.append(response_text)

    # Add action guidance if needed
    if needs_action:
        # Map category to action category
        action_category = category
        if category == "self_doubt":
            action_category = "self_doubt"
        elif category == "crisis":
            action_category = "crisis"
        elif category == "celebration":
            action_category = "celebration"
        elif category == "permission":
            action_category = "permission"
        elif category == "time_boxing":
            action_category = "time_boxing"
        else:
            action_category = "stress"  # Default

        if action_category in ACTION_TEMPLATES:
            action = ACTION_TEMPLATES[action_category][0]  # Use first template
            parts.append(action)

    return " ".join(parts)

def augment_training_data(input_path: str, output_path: str):
    """Augment training data with warmth/action templates"""

    print("=" * 80)
    print("TRAINING DATA AUGMENTATION")
    print("=" * 80)
    print()

    # Load training data
    print(f"Loading training data from: {input_path}")
    examples = []
    with open(input_path, 'r') as f:
        for line in f:
            examples.append(json.loads(line))

    print(f"Total examples: {len(examples)}")
    print()

    # Augment examples
    print("Augmenting examples with warmth/action templates...")
    augmented_count = 0

    for example in examples:
        messages = example['messages']

        # Find user query and assistant response
        query_text = ""
        response_text = ""
        for msg in messages:
            if msg['role'] == 'user':
                query_text = msg['content']
            elif msg['role'] == 'assistant':
                response_text = msg['content']

        if not query_text or not response_text:
            continue

        # Detect category
        category = detect_emotional_category(query_text, response_text)

        # Augment if needed
        augmented_response = augment_response(query_text, response_text, category)

        # Update if changed
        if augmented_response != response_text:
            for msg in messages:
                if msg['role'] == 'assistant':
                    msg['content'] = augmented_response
                    augmented_count += 1
                    break

    print(f"Augmented: {augmented_count} examples")
    print(f"Unchanged: {len(examples) - augmented_count} examples")
    print()

    # Save augmented data
    print(f"Saving augmented data to: {output_path}")
    with open(output_path, 'w') as f:
        for example in examples:
            f.write(json.dumps(example) + '\n')

    print()
    print("=" * 80)
    print("AUGMENTATION COMPLETE")
    print("=" * 80)
    print()
    print("Next steps:")
    print("1. Review augmented data quality")
    print("2. Run quality checks on warmth/action coverage")
    print("3. If quality good, proceed to jenny_v10_eq training")

if __name__ == "__main__":
    import sys

    if len(sys.argv) != 3:
        print("Usage: python augment_training_with_templates.py <input.jsonl> <output.jsonl>")
        print()
        print("Example:")
        print("  python augment_training_with_templates.py \\")
        print("    jenny_v10_eq_complete_units.jsonl \\")
        print("    jenny_v10_eq_augmented.jsonl")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    augment_training_data(input_path, output_path)
