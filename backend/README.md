# ShareVibe Email Marketing Backend

Production-grade email campaign system for ShareVibe cafes.

## Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your values
npx prisma db push
npm run dev
```

## Services

### API Server (Port 3001)
```bash
npm run dev
```

### Queue Worker (separate process)
```bash
npm run worker
```

## Key Files

- **Prisma Schema** (`prisma/schema.prisma`): Database models
- **Services**:
  - `BrevoService.ts`: Email sending via Brevo API
  - `EmailSendingService.ts`: Campaign orchestration
  - `LimitService.ts`: Rate limiting logic
  - `UnsubscribeService.ts`: Unsubscribe management
- **Routes**:
  - `campaigns.ts`: Campaign CRUD + send
  - `customers.ts`: Customer management
  - `analytics.ts`: Dashboard & stats
  - `unsubscribe.ts`: Public unsubscribe endpoint
- **Worker** (`worker.ts`): Queue job processor

## Environment Variables

```
DATABASE_URL=your-postgres-connection-url
REDIS_URL=redis://localhost:6379
BREVO_API_KEY=your-brevo-api-key
EMAIL_SENDER=no-reply@mail.sharevibe.co
EMAIL_SENDER_NAME=ShareVibe
GLOBAL_DAILY_LIMIT=280
PER_CAFE_DAILY_LIMIT=50
PER_CAMPAIGN_LIMIT=50
```

## API Examples

### Create Campaign
```bash
POST /api/campaigns
X-Firebase-Id: user-id
X-User-Role: cafe_admin
Content-Type: application/json

{
  "cafeId": "cafe-123",
  "subject": "Weekly Offers",
  "htmlContent": "<h1>Sale!</h1>",
  "textContent": "Sale!"
}
```

### Send Campaign
```bash
POST /api/campaigns/{campaignId}/send
X-Firebase-Id: user-id
X-User-Role: cafe_admin

{}
```

### Unsubscribe (Public)
```
GET /public/unsubscribe/{token}?email=user@example.com
```

## Features

✓ Multi-tenant café isolation
✓ Brevo REST API integration (shared domain)
✓ Queue-based async sending (5 concurrent, 1/sec rate limit)
✓ Automatic limit enforcement (global, per-cafe, per-campaign)
✓ Unsubscribe management + compliance
✓ Spam filtering
✓ Comprehensive logging
✓ Firebase JWT auth integration
✓ Webhook support for bounces/complaints

## Deployment

```bash
npm run build
PORT=3001 npm run start
# Separate terminal:
npm run worker
```

Requires: PostgreSQL + Redis
