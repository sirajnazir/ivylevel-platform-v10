#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
eval_tone_proof_compare.py
Compare base model vs fine-tuned model on tone & proof metrics
"""

import json, re, statistics, sys, os
from pathlib import Path
from openai import OpenAI

client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

def heuristic_tone_score(text: str) -> float:
    """Crude tone heuristic: warmth markers + avoidance of harsh negations"""
    warm = len(re.findall(r"\b(thank|appreciate|glad|together|let's|we can|i hear)\b", text.lower()))
    harsh = len(re.findall(r"\b(stupid|dumb|lazy|worthless)\b", text.lower()))
    return max(0.0, min(1.0, 0.5 + 0.1*warm - 0.2*harsh))

def heuristic_proof_score(text: str) -> float:
    """Looks for proof cues (not perfect but useful)"""
    cues = sum(
        c in text.lower()
        for c in ["source:", "verified", "citation", "proof", "evidence", "as of ", "on ", "per "]
    )
    return max(0.0, min(1.0, 0.3 + 0.1*cues))

def generate_response(model: str, user_prompt: str, system_prompt: str) -> str:
    """Generate a response from the given model"""
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.6
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        print(f"Error generating response with {model}: {e}", file=sys.stderr)
        return ""

def evaluate_model(model: str, test_data: list) -> dict:
    """Evaluate a model on test data"""
    tone_scores = []
    proof_scores = []

    for item in test_data:
        messages = item.get("messages", [])
        system_msg = next((m["content"] for m in messages if m.get("role") == "system"),
                         "You are Jenny, an empathetic coach. Be warm and specific. Cite sources when asserting facts.")
        user_msg = next((m["content"] for m in messages if m.get("role") == "user"), "")

        if not user_msg:
            continue

        # Generate response
        response = generate_response(model, user_msg, system_msg)
        if not response:
            continue

        # Score the response
        tone_scores.append(heuristic_tone_score(response))
        proof_scores.append(heuristic_proof_score(response))

    return {
        "model": model,
        "n": len(tone_scores),
        "tone_mean": statistics.mean(tone_scores) if tone_scores else 0.0,
        "tone_median": statistics.median(tone_scores) if tone_scores else 0.0,
        "proof_mean": statistics.mean(proof_scores) if proof_scores else 0.0,
        "proof_median": statistics.median(proof_scores) if proof_scores else 0.0
    }

def main():
    if len(sys.argv) < 4:
        print(f"Usage: {sys.argv[0]} <test_file.jsonl> <base_model> <ft_model>")
        print(f"Example: {sys.argv[0]} data/training/ft_test.jsonl gpt-4o-mini-2024-07-18 ft:gpt-4o-mini-2024-07-18:personal:v8-prod:CO8TAkWg")
        sys.exit(1)

    test_file = Path(sys.argv[1])
    base_model = sys.argv[2]
    ft_model = sys.argv[3]

    if not test_file.exists():
        print(f"Error: Test file not found: {test_file}", file=sys.stderr)
        sys.exit(1)

    # Load test data
    test_data = [json.loads(line) for line in open(test_file, "r", encoding="utf-8")]
    print(f"Loaded {len(test_data)} test examples from {test_file}")
    print()

    # Evaluate base model
    print(f"Evaluating base model: {base_model}")
    base_results = evaluate_model(base_model, test_data)

    # Evaluate fine-tuned model
    print(f"Evaluating fine-tuned model: {ft_model}")
    ft_results = evaluate_model(ft_model, test_data)

    # Calculate deltas
    tone_delta = ft_results["tone_mean"] - base_results["tone_mean"]
    proof_delta = ft_results["proof_mean"] - base_results["proof_mean"]

    # Print results
    print()
    print("=" * 60)
    print("Evaluation Results")
    print("=" * 60)
    print()

    print(f"Base Model ({base_model}):")
    print(f"  Evaluated: {base_results['n']} examples")
    print(f"  Tone:  mean={base_results['tone_mean']:.3f}, median={base_results['tone_median']:.3f}")
    print(f"  Proof: mean={base_results['proof_mean']:.3f}, median={base_results['proof_median']:.3f}")
    print()

    print(f"Fine-Tuned Model ({ft_model}):")
    print(f"  Evaluated: {ft_results['n']} examples")
    print(f"  Tone:  mean={ft_results['tone_mean']:.3f}, median={ft_results['tone_median']:.3f}")
    print(f"  Proof: mean={ft_results['proof_mean']:.3f}, median={ft_results['proof_median']:.3f}")
    print()

    print("Deltas (FT - Base):")
    print(f"  Tone:  {tone_delta:+.3f}")
    print(f"  Proof: {proof_delta:+.3f}")
    print()

    # Success criteria
    print("=" * 60)
    print("Success Criteria")
    print("=" * 60)
    tone_pass = ft_results['tone_mean'] >= 0.88 and tone_delta >= 0.05
    proof_pass = ft_results['proof_mean'] >= 0.55 and proof_delta >= 0.00

    print(f"✓ Tone ≥ 0.88 AND delta ≥ +0.05: {'✅ PASS' if tone_pass else '❌ FAIL'}")
    print(f"  FT tone: {ft_results['tone_mean']:.3f}, delta: {tone_delta:+.3f}")

    print(f"✓ Proof ≥ 0.55 AND delta ≥ 0.00: {'✅ PASS' if proof_pass else '❌ FAIL'}")
    print(f"  FT proof: {ft_results['proof_mean']:.3f}, delta: {proof_delta:+.3f}")
    print()

    if tone_pass and proof_pass:
        print("🎉 OVERALL: ✅ PASS - Ready to ramp canary")
    else:
        print("⚠️  OVERALL: ❌ FAIL - Consider re-tuning or adjusting gates")
    print()

    # JSON output for automation
    output = {
        "base": base_results,
        "ft": ft_results,
        "deltas": {"tone": tone_delta, "proof": proof_delta},
        "pass": {"tone": tone_pass, "proof": proof_pass, "overall": tone_pass and proof_pass}
    }

    output_file = test_file.parent / f"eval_results_{ft_model.split(':')[-1]}.json"
    with open(output_file, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Results saved to: {output_file}")

if __name__ == "__main__":
    main()
