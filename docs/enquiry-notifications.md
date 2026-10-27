# Enquiry email notifications

The website already saves enquiries in the `enquiries` table. Email notifications are sent server-side by the `notify-enquiry` Supabase Edge Function, so the Resend API key never reaches the browser.

## 1. Create and verify a Resend sender

Create a Resend account, verify the business sending domain, and create an API key. The `from` address must use the verified domain.

## 2. Deploy the function

Install and authenticate the Supabase CLI, then run these commands from the project folder:

```bash
supabase functions deploy notify-enquiry --no-verify-jwt
supabase secrets set \
  RESEND_API_KEY=re_xxxxxxxxx \
  ENQUIRY_NOTIFICATION_EMAIL=admin@example.com \
  MAIL_FROM=Prime Assets <notifications@example.com> \
  ENQUIRY_WEBHOOK_SECRET=$(openssl rand -hex 32)
```

Save the generated `ENQUIRY_WEBHOOK_SECRET`; it is needed when creating the webhook.

## 3. Create the database webhook

In Supabase Dashboard:

1. Open **Database → Webhooks** and create a webhook.
2. Select table `public.enquiries` and event **Insert**.
3. Select **Edge Function** as the target and choose `notify-enquiry`.
4. Add this HTTP header:

```text
Authorization: Bearer YOUR_ENQUIRY_WEBHOOK_SECRET
```

Use the exact secret stored in Supabase, without the placeholder text.

## 4. Test

Submit an enquiry from the public contact form. Confirm that:

- The enquiry appears in the admin dashboard.
- The notification arrives at `ENQUIRY_NOTIFICATION_EMAIL`.
- The function logs show no Resend or configuration errors.

The function sends a notification containing the visitor's name, contact details, subject, message, and property ID. It does not expose the email provider credentials to the public site.
