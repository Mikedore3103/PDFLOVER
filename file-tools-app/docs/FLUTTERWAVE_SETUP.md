# Flutterwave Setup

This project uses Flutterwave Standard for hosted checkout. The frontend never
receives a secret key and a redirect never activates a plan. The webhook and a
server-side transaction verification request are required before activation.

## Environment Variables

Set these on the backend only:

```env
FLW_SECRET_KEY=your_flutterwave_secret_key
FLW_SECRET_HASH=your_webhook_secret_hash
FLW_BASE_URL=https://api.flutterwave.com
FLW_REDIRECT_URL=https://your-backend.example.com/api/billing/callback
FLW_FRONTEND_URL=https://your-frontend.example.com/
FLW_PAYMENT_OPTIONS=card,banktransfer,ussd
FLW_CHECKOUT_TITLE=PDF Lover
FLW_SUBSCRIPTION_DAYS=30
```

Use the sandbox API base URL and sandbox credentials when testing. Never place
`FLW_SECRET_KEY` or `FLW_SECRET_HASH` in `script.js`, HTML, or public hosting.

## Flutterwave Dashboard

Configure this webhook URL in Flutterwave:

```text
https://your-backend.example.com/api/billing/webhook
```

Set the same random value as `FLW_SECRET_HASH` in the Flutterwave webhook
settings. The server validates the `flutterwave-signature` HMAC-SHA256 header
against the raw request body.

## Application Routes

```text
POST /api/billing/checkout       Authenticated; initializes a pending payment
GET  /api/billing/callback       Flutterwave redirect target; never activates a plan
POST /api/billing/webhook        Signature-verified payment notification
GET  /api/billing/status/:ref    Authenticated status lookup for the owner
```

The checkout request accepts only a plan code. The server loads the active plan
and amount from MongoDB. Successful webhook processing verifies the Flutterwave
transaction reference, amount, currency, and customer before updating the user
and subscription records.

## Official References

- https://developer.flutterwave.com/docs/flutterwave-standard
- https://developer.flutterwave.com/docs/webhooks
- https://developer.flutterwave.com/docs/authentication
- https://developer.flutterwave.com/reference/charges_get