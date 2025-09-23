import boto3, datetime as dt, argparse, json
def main():
  ap = argparse.ArgumentParser()
  ap.add_argument("--start", default=(dt.date.today()-dt.timedelta(days=30)).isoformat())
  ap.add_argument("--end", default=dt.date.today().isoformat())
  args = ap.parse_args()
  ce = boto3.client("ce")
  res = ce.get_cost_and_usage(TimePeriod={"Start": args.start, "End": args.end}, Granularity="DAILY", Metrics=["UnblendedCost"], GroupBy=[{"Type":"DIMENSION","Key":"SERVICE"}])
  print(json.dumps(res["ResultsByTime"], indent=2, default=str))
if __name__ == "__main__":
  main()
