// Best-effort owner alerts: delivery failures must not undo a signup or payment.
async function sendAdminNotification(subject, textContent) {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const sender = process.env.BREVO_FROM?.trim();
  const recipient = process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || 'akanomichael3103@gmail.com';
  if (!apiKey || !sender) {
    console.warn('Admin notification skipped: configure BREVO_API_KEY and BREVO_FROM.');
    return false;
  }
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: 'PDFLOVER', email: sender },
        to: [{ email: recipient }],
        subject,
        textContent
      })
    });
    if (!response.ok) {
      console.error('Admin notification rejected by Brevo (HTTP ' + response.status + ').');
      return false;
    }
    return true;
  } catch {
    console.error('Admin notification could not be delivered to Brevo.');
    return false;
  }
}

function notifySignup(user) {
  return sendAdminNotification('PDFLOVER: New signup', [
    'A new account has been created.',
    'Username: ' + user.username,
    'Email: ' + user.email,
    'Signed up at: ' + new Date(user.createdAt || Date.now()).toISOString()
  ].join('\n'));
}

function notifySubscription(user, payment, expiresAt, paidAt) {
  return sendAdminNotification('PDFLOVER: Payment confirmed and subscription activated', [
    'Payment was verified and the subscription was successfully activated.',
    'Username: ' + (user.username || '(not set)'),
    'Email: ' + user.email,
    'Amount paid: ' + payment.currency + ' ' + payment.amount,
    'New plan: ' + payment.plan.name,
    'Payment reference: ' + payment.reference,
    'Paid at: ' + paidAt.toISOString(),
    'Expires at: ' + expiresAt.toISOString()
  ].join('\n'));
}

module.exports = { notifySignup, notifySubscription };
