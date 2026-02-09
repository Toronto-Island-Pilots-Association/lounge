# Database Migrations

This directory contains SQL migration scripts for the TIPA database schema.

## Migration Files

### 001_create_payments_table.sql
Creates the `payments` table for tracking all membership payments (Stripe, PayPal, and cash).

**What it does:**
- Creates the `payments` table with all necessary columns
- Adds indexes for performance optimization
- Adds table and column comments for documentation

**When to run:**
- When setting up a new database
- When adding payment tracking functionality

## How to Run Migrations

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `supabase/migrations/001_create_payments_table.sql`
5. Click **Run** to execute the migration

### Option 2: Using Supabase CLI

If you have Supabase CLI set up locally:

```bash
# Apply all pending migrations
supabase db push

# Or run a specific migration
supabase migration up
```

### Option 3: Direct SQL Execution

If you have direct database access via psql:

```bash
psql -h <your-db-host> -U postgres -d postgres -f supabase/migrations/001_create_payments_table.sql
```

## Migration Safety

This migration is **idempotent** - it can be run multiple times safely. It uses `IF NOT EXISTS` clauses to prevent errors if objects already exist.

**Always backup your database** before running migrations in production!

## Verifying the Migration

After running the migration, verify it was successful:

```sql
-- Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'payments';

-- Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'payments'
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'payments';
```

## Rollback (if needed)

If you need to remove the payments table:

```sql
-- WARNING: This will delete all payment data!
DROP INDEX IF EXISTS idx_payments_paypal_subscription_id;
DROP INDEX IF EXISTS idx_payments_stripe_subscription_id;
DROP INDEX IF EXISTS idx_payments_payment_date;
DROP INDEX IF EXISTS idx_payments_user_id;
DROP TABLE IF EXISTS payments CASCADE;
```

**⚠️ Warning:** Rolling back will delete all payment records. Only do this if absolutely necessary and you have a backup.
