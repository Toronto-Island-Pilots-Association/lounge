# Discussion Digest Cron Job Setup

This document explains how to set up the weekly discussion digest email that sends the last 7 discussion topics to all members every 7 days.

## Overview

The discussion digest cron job:
- Runs every 7 days (weekly)
- Fetches the last 7 discussion topics from the past 7 days
- Sends an email digest to all approved members
- Includes thread titles, previews, authors, and comment counts

## Setup Options

### Option 1: Vercel Cron Jobs (Recommended if deployed on Vercel)

If you're deploying on Vercel, the cron job is already configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/discussion-digest",
      "schedule": "0 9 * * 1"
    }
  ]
}
```

This runs every Monday at 9:00 AM UTC.

**To activate:**
1. Deploy your application to Vercel
2. The cron job will automatically be registered
3. Vercel will call the endpoint with proper authentication headers

**Schedule format:** `"0 9 * * 1"` means:
- `0` - minute (0)
- `9` - hour (9 AM)
- `*` - day of month (any)
- `*` - month (any)
- `1` - day of week (Monday, where 0 = Sunday)

To change the schedule, modify the cron expression in `vercel.json`. Common schedules:
- `"0 9 * * 1"` - Every Monday at 9 AM UTC
- `"0 0 * * 0"` - Every Sunday at midnight UTC
- `"0 9 * * *"` - Every day at 9 AM UTC

### Option 2: External Cron Service

If you're not using Vercel or want more control, you can use an external cron service:

#### Using cron-job.org or similar:

1. Sign up for a free cron service (e.g., [cron-job.org](https://cron-job.org))
2. Create a new cron job with:
   - **URL**: `https://your-domain.com/api/cron/discussion-digest`
   - **Schedule**: Every 7 days (e.g., `0 9 * * 1` for Mondays at 9 AM)
   - **Method**: GET
   - **Headers**: 
     ```
     Authorization: Bearer YOUR_CRON_SECRET
     ```

3. Set the `CRON_SECRET` environment variable in your deployment:
   ```env
   CRON_SECRET=your-secret-token-here
   ```

#### Using GitHub Actions:

Create `.github/workflows/discussion-digest.yml`:

```yaml
name: Discussion Digest

on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM UTC
  workflow_dispatch:  # Allow manual triggering

jobs:
  send-digest:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Digest
        run: |
          curl -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://your-domain.com/api/cron/discussion-digest
```

## Environment Variables

Make sure these are set in your deployment:

```env
# Required
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Optional (for external cron services)
CRON_SECRET=your-secret-token-here
```

## Testing

You can manually test the endpoint:

```bash
# If using CRON_SECRET
curl -X GET \
  -H "Authorization: Bearer your-secret-token" \
  https://your-domain.com/api/cron/discussion-digest

# If using Vercel Cron (no auth needed, Vercel handles it)
curl -X GET https://your-domain.com/api/cron/discussion-digest
```

## Response Format

The endpoint returns:

```json
{
  "success": true,
  "message": "Digest sent to 50 members",
  "threadsSent": 7,
  "membersNotified": 50,
  "membersFailed": 0
}
```

## Troubleshooting

1. **No emails sent**: Check that:
   - `RESEND_API_KEY` is set correctly
   - `RESEND_FROM_EMAIL` is verified in Resend
   - Members have approved status in the database

2. **Unauthorized error**: 
   - If using external cron, ensure `CRON_SECRET` matches
   - If using Vercel, ensure the cron job is properly configured

3. **No threads found**: The digest will still send but with a message indicating no discussions in the past 7 days

4. **Check logs**: Monitor your deployment logs for any errors during execution
