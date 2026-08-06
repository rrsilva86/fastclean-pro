# HighLevel Integration

## Current API Versions

Before adding or changing a HighLevel request, verify the current official endpoint version in the HighLevel API documentation. HighLevel does not use one universal version for every endpoint.

Verified current endpoints for this integration:

| Feature | Method | Endpoint | Version | Minimum scope |
| --- | --- | --- | --- | --- |
| Send SMS | POST | `https://services.leadconnectorhq.com/conversations/messages` | `v3` | `conversations/message.write` |
| Contact upsert | POST | `https://services.leadconnectorhq.com/contacts/upsert` | `v3` | `contacts.write` |

Required headers for these v3 endpoints:

```http
Authorization: Bearer <PRIVATE_INTEGRATION_TOKEN>
Version: v3
Content-Type: application/json
Accept: application/json
```

Never expose or log the token.

## Initial Internal Authentication

For the initial single-company implementation, use a HighLevel Sub-Account Private Integration Token.

Environment variables:

```bash
HIGHLEVEL_PRIVATE_TOKEN=
HIGHLEVEL_LOCATION_ID=
HIGHLEVEL_LEGACY_WEBHOOK_RSA_PUBLIC_KEY=
```

Do not store `HIGHLEVEL_PRIVATE_TOKEN` in the application database for this initial implementation.

## First SMS Test

For the first internal test, use Rafael's HighLevel sub-account because Raisa's HighLevel account does not have SMS enabled yet.

1. Create a Sub-Account Private Integration Token in Rafael's HighLevel account.
2. Grant only the minimum scopes for this test:
   - `contacts.write`
   - `conversations/message.write`
3. Set these environment variables:

```bash
HIGHLEVEL_PRIVATE_TOKEN=
HIGHLEVEL_LOCATION_ID=
```

4. Restart the app.
5. Open **Settings → HighLevel SMS test**.
6. Enter a test phone number and message.
7. Send the test SMS.

The test route is:

```http
POST /api/highlevel/test-sms
```

The route first upserts a temporary HighLevel contact using `POST /contacts/upsert`, then sends the SMS with `POST /conversations/messages`. Both requests use `Version: v3`.

Expected minimum scopes:

- `conversations/message.write` for SMS sending.
- `contacts.write` for contact upsert.
- `conversations/message.readonly` only if message lookup is later required.
- `contacts.readonly` only if contact retrieval/search is later required.

Grant only the scopes required by the enabled features.

## Contact Sync

Use HighLevel contact upsert as the primary sync path:

```http
POST /contacts/upsert
Version: v3
```

The HighLevel upsert behavior follows the sub-account's **Allow Duplicate Contact** setting. FastClean Pro should not implement a separate duplicate-contact algorithm that conflicts with that setting.

Before upsert:

- Normalize phone numbers to E.164 when possible.
- Validate email and phone.
- Send the correct HighLevel Location ID.
- Do not send empty local values that would overwrite useful HighLevel values.

After upsert:

- Save the returned HighLevel contact ID locally.
- Save sync timestamp and status.
- Treat ambiguous legacy contact conflicts as review items.

## Webhook Security

Do not use a generic shared `HIGHLEVEL_WEBHOOK_SECRET`.

Webhook verification must use the current official HighLevel signature mechanism:

- Prefer `X-GHL-Signature` using Ed25519 verification.
- Fall back to `X-WH-Signature` using RSA verification only when applicable.
- Verify the raw request body before parsing JSON.
- Reject invalid signatures.
- Store provider webhook IDs to prevent duplicate processing.
- Respond quickly after validation and process heavier work asynchronously.
- Do not trust `locationId`, `contactId`, `conversationId`, `messageId`, or event type until the signature has been verified.

The app route is:

```http
POST /api/highlevel/webhook
```

## Token Rotation

Rotate HighLevel Private Integration Tokens periodically.

1. Generate or rotate the token in HighLevel.
2. Update `HIGHLEVEL_PRIVATE_TOKEN` in Railway.
3. Redeploy or restart the service.
4. Test the connection and SMS sending.
5. Revoke or expire the old token after the transition period.

## Future Multi-Tenant Implementation

When FastClean Pro moves from one internal company to true external HighLevel marketplace usage, replace the Sub-Account Private Integration Token with OAuth Sub-Account Access Tokens per tenant/location. Store OAuth tokens encrypted and scoped to the tenant/company/location that owns them.
