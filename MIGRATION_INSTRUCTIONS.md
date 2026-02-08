# Database Migration Instructions

## Adding Category Column to Threads Table

To add the `category` column to your `threads` table for classifieds categorization, follow these steps:

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `supabase/migrations/add_classifieds_category.sql`
5. Click **Run** to execute the migration

### Option 2: Using Supabase CLI

If you have Supabase CLI set up locally:

```bash
supabase db push
```

Or run the migration directly:

```bash
psql -h <your-db-host> -U postgres -d postgres -f supabase/migrations/add_classifieds_category.sql
```

### Option 3: Direct SQL Execution

If you have direct database access, you can run the SQL from `supabase/migrations/add_classifieds_category.sql` directly.

### What This Migration Does

1. **Adds the `category` column** to the `threads` table (if it doesn't exist)
   - Type: `TEXT`
   - Default value: `'other'`
   - Required: `NOT NULL`

2. **Creates a CHECK constraint** to ensure only valid categories are allowed:
   - `aircraft_shares` - Aircraft Shares / Block Time
   - `instructor_availability` - Instructor Availability
   - `gear_for_sale` - Gear for Sale
   - `lounge_feedback` - Lounge Feedback
   - `other` - Other

3. **Adds a column comment** describing the category options

### Verification

After running the migration, verify the column was added:

```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'threads' 
AND column_name = 'category';
```

You should see the `category` column with:
- `data_type`: `text`
- `column_default`: `'other'`

Verify the constraint:

```sql
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'threads_category_check';
```

### Notes

- **Idempotent**: This migration is safe to run multiple times - it checks if the column exists before adding it
- **Existing data**: All existing threads will automatically get the `'other'` category as the default
- **Permissions**: Make sure you have the necessary permissions to alter the table
- **No data loss**: This migration only adds a column and constraint - no existing data will be affected
