#!/usr/bin/env bash
echo "[Cost tips]"
echo "1) Keep Agent/Retriever local or single EC2 until NSM passed."
echo "2) ECS desiredCount=0 off-hours; CloudWatch retention 7 days."
echo "3) RDS optional; Docker PG is fine for 2 users."
