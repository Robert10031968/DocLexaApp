# Cron Job Integration for Cleanup Function

This guide explains how to set up a scheduled task using [cron-job.org](https://cron-job.org) to automatically call the `cleanup-expired-documents` Supabase Edge Function every day at 3:00 AM UTC.

## Function Endpoint

The Edge Function is deployed at:
```
https://utvolelclhzesimpwbrl.functions.supabase.co/cleanup-expired-documents
```

## Prerequisites

- A web browser
- Access to the internet
- The `CRON_SECRET` value from your Supabase Edge Function environment variables

## Step-by-Step Setup

### 1. Register an Account at cron-job.org

1. Go to [https://cron-job.org](https://cron-job.org)
2. Click **"Sign Up"** or **"Register"** in the top right corner
3. Fill in your email address and choose a password
4. Verify your email address (check your inbox for a confirmation email)
5. Log in to your account

### 2. Create a New Cron Job

1. After logging in, click **"Create cronjob"** or **"Add new cronjob"**
2. Fill in the following details:

#### Basic Settings
- **Title**: `Cleanup Expired Documents`
- **URL**: `https://utvolelclhzesimpwbrl.functions.supabase.co/cleanup-expired-documents`
- **Method**: Select **POST** from the dropdown

#### Schedule Settings
- **Schedule**: Select **"Daily"**
- **Time**: Set to **03:00** (3:00 AM)
- **Timezone**: Select **UTC**

#### Advanced Settings
- **HTTP Headers**: Add a custom header:
  - **Header Name**: `Authorization`
  - **Header Value**: `Bearer my_super_secret_cron_token`

> **Important**: Replace `my_super_secret_cron_token` with the actual `CRON_SECRET` value from your Supabase Edge Function environment variables.

### 3. Save and Activate

1. Click **"Create"** or **"Save"** to create the cron job
2. The job should automatically be activated and start running according to the schedule

## Security Note

The `Authorization` header with the Bearer token is required for security. The token must match the `CRON_SECRET` environment variable configured in your Supabase Edge Function. This prevents unauthorized access to your cleanup function.

## Testing the Function

You can test the function manually using curl:

```bash
curl -X POST \
  https://utvolelclhzesimpwbrl.functions.supabase.co/cleanup-expired-documents \
  -H "Authorization: Bearer my_super_secret_cron_token" \
  -H "Content-Type: application/json"
```

> **Note**: Replace `my_super_secret_cron_token` with your actual `CRON_SECRET` value.

## Monitoring

- **cron-job.org Dashboard**: Monitor job execution status, logs, and success/failure rates
- **Supabase Dashboard**: Check function logs in the Supabase dashboard under Edge Functions
- **Email Notifications**: Configure email alerts in cron-job.org for failed executions

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check that the `Authorization` header value matches your `CRON_SECRET`
2. **404 Not Found**: Verify the function URL is correct and the function is deployed
3. **500 Internal Server Error**: Check the Supabase function logs for detailed error messages

### Checking Function Logs

1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions**
3. Find `cleanup-expired-documents` function
4. Click on **"Logs"** to view execution history

## Alternative Scheduling Options

If cron-job.org doesn't meet your needs, consider these alternatives:

- **GitHub Actions**: Use GitHub's scheduled workflows
- **AWS EventBridge**: For AWS-based solutions
- **Google Cloud Scheduler**: For GCP-based solutions
- **Self-hosted cron**: On your own server infrastructure

## Support

- **cron-job.org Support**: [https://cron-job.org/en/support/](https://cron-job.org/en/support/)
- **Supabase Documentation**: [https://supabase.com/docs/guides/functions](https://supabase.com/docs/guides/functions)
- **Project Issues**: Create an issue in your project repository for function-specific problems 