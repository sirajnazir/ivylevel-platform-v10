#!/usr/bin/env bash
START=${1:-$(date -d '30 days ago' +%F)}
END=${2:-$(date +%F)}
aws ce get-cost-and-usage --time-period Start=$START,End=$END --granularity DAILY --metrics UnblendedCost --group-by Type=DIMENSION,Key=SERVICE
