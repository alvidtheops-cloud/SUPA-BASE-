const resendApiKey = Deno.env.get('RESEND_API_KEY');
const notificationEmail = Deno.env.get('ENQUIRY_NOTIFICATION_EMAIL');
const mailFrom = Deno.env.get('MAIL_FROM');
const webhookSecret = Deno.env.get('ENQUIRY_WEBHOOK_SECRET');

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  if (!resendApiKey || !notificationEmail || !mailFrom || !webhookSecret) {
    console.error('Notification function secrets are not configured.');
    return json({ error: 'Notification service is not configured.' }, 500);
  }

  const authorization = request.headers.get('authorization');
  if (authorization !== `Bearer ${webhookSecret}`) {
    return json({ error: 'Unauthorized.' }, 401);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid JSON payload.' }, 400);
  }

  if (payload.type !== 'INSERT' || payload.table !== 'enquiries' || !payload.record) {
    return json({ error: 'Unsupported webhook payload.' }, 400);
  }

  const enquiry = payload.record;
  const subject = text(enquiry.subject) || 'New website enquiry';
  const name = text(enquiry.name) || 'Not provided';
  const contact = text(enquiry.contact) || 'Not provided';
  const message = text(enquiry.message) || 'Not provided';
  const propertyId = text(enquiry.property_id) || 'General enquiry';

  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: mailFrom,
      to: [notificationEmail],
      subject: `[Prime Assets] ${subject}`,
      html: `
        <h2>New website enquiry</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Contact:</strong> ${escapeHtml(contact)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
        <p><strong>Property ID:</strong> ${escapeHtml(propertyId)}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(message).replaceAll('\n', '<br>')}</p>
      `,
    }),
  });

  if (!emailResponse.ok) {
    const errorBody = await emailResponse.text();
    console.error('Resend rejected enquiry notification:', errorBody);
    return json({ error: 'Email provider rejected the notification.' }, 502);
  }

  return json({ sent: true });
});

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
