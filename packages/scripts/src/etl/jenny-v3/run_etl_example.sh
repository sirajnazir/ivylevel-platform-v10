#!/bin/bash
# Example script showing how to run the ETL with your actual database

# Option 1: Using individual PG variables
export PGHOST="your-host"
export PGPORT="5432"
export PGDATABASE="jenny"
export PGUSER="jenny"
export PGPASSWORD="your-password"
DATABASE_URL="postgresql://$PGUSER:$PGPASSWORD@$PGHOST:$PGPORT/$PGDATABASE"

# Option 2: Using a full connection string
# DATABASE_URL="postgresql://username:password@host:port/database"

# Run the ETL
cd /Users/snazir/ivylevel-platform-v10/packages/scripts/src/etl/jenny-v3
./run_etl.sh "$DATABASE_URL"