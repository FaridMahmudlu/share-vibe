# Email Marketing Backend - File Structure

```
backend/
├── src/
│   ├── index.ts                 # Express server entry point
│   ├── worker.ts                # BullMQ queue worker
│   ├── services/
│   │   ├── BrevoService.ts      # Brevo REST API adapter
│   │   ├── EmailSendingService.ts # Campaign orchestration (7-step flow)
│   │   ├── LimitService.ts      # Rate limiting (global/cafe/campaign)
│   │   └── UnsubscribeService.ts # Unsubscribe token management
│   ├── routes/
│   │   ├── campaigns.ts         # POST/GET/PATCH/DELETE campaigns + send
│   │   ├── customers.ts         # CRUD customers + bulk import
│   │   ├── unsubscribe.ts       # Public unsubscribe + Brevo webhook
│   │   └── analytics.ts         # Campaign stats + cafe dashboard
│   ├── queue/
│   │   └── emailQueue.ts        # BullMQ configuration
│   ├── middleware/
│   │   └── auth.ts              # Firebase auth + tenant scoping
│   └── db/
│       └── [future: database utilities]
├── prisma/
│   ├── schema.prisma            # Database models (9 tables)
│   ├── seed.ts                  # Database seed script
│   └── migration_init.sql       # Initial migration SQL
├── package.json                 # Dependencies + scripts
├── tsconfig.json                # TypeScript config
├── .env.example                 # Environment template
├── .gitignore                   # Git ignore patterns
├── README.md                    # Setup instructions
└── INTEGRATION_GUIDE.md         # Frontend integration guide

src/ (Frontend additions)
└── services/
    └── emailService.ts          # React API client service
```

## Core Flow

```
1. Admin creates campaign
   POST /api/campaigns → Create draft

2. Admin sends campaign
   POST /api/campaigns/:id/send
   ↓
   EmailSendingService.sendCampaign()
   ├─ Validate campaign
   ├─ Get recipients (customers)
   ├─ Filter unsubscribed
   ├─ Filter duplicates
   ├─ Check global limit
   ├─ Check cafe limit
   ├─ Check campaign limit
   ├─ Create EmailRecipient records (atomic)
   ├─ Queue jobs (BullMQ)
   └─ Increment counters

3. Queue worker processes jobs
   emailQueue → Worker
   ├─ Fetch job (campaignId, cafeId, email)
   ├─ Validate email
   ├─ Check unsubscribed
   ├─ Send via Brevo API
   ├─ Update status (sent/failed)
   └─ Log result

4. Brevo webhooks
   /public/webhooks/brevo
   ├─ Bounce → mark failed
   └─ Complaint → auto-unsubscribe

5. Analytics
   GET /api/campaigns/:id/analytics
   → Campaign stats (sent/failed/pending)
```

## Authentication & Security

**Auth Headers** (all API calls):
- `X-Firebase-Id`: User's Firebase ID
- `X-User-Role`: 'cafe_admin' or 'super_admin'

**Tenant Scoping**:
- cafe_admin: Can only access own cafe data
- super_admin: Can access all cafes

**Validation**:
- Campaign ownership check
- Cafe ownership check
- Email format validation
- Spam pattern detection
- Link density check (max 20 links)

## Environment Variables

```env
# Database
DATABASE_URL=your-postgres-connection-url

# Queue
REDIS_URL=redis://localhost:6379

# Brevo API
BREVO_API_KEY=your-brevo-api-key
EMAIL_SENDER=no-reply@mail.sharevibe.co
EMAIL_SENDER_NAME=ShareVibe
BREVO_BASE_URL=https://api.brevo.com/v3

# Limits
GLOBAL_DAILY_LIMIT=280      # Total platform limit
PER_CAFE_DAILY_LIMIT=50     # Per cafe limit
PER_CAMPAIGN_LIMIT=50       # Max recipients per campaign

# Server
PORT=3001
NODE_ENV=development
```

## API Endpoints Summary

**Campaigns** (Protected):
- `POST /api/campaigns` - Create draft
- `GET /api/campaigns/:id` - Get with recipients
- `GET /api/cafes/:cafeId/campaigns` - List (paginated)
- `POST /api/campaigns/:id/send` - Send (queues jobs)
- `PATCH /api/campaigns/:id` - Update draft
- `DELETE /api/campaigns/:id` - Delete draft

**Customers** (Protected):
- `POST /api/cafes/:cafeId/customers` - Create
- `GET /api/cafes/:cafeId/customers` - List (paginated)
- `POST /api/cafes/:cafeId/customers/bulk` - Bulk import (max 10k)
- `GET /api/cafes/:cafeId/customers/:id` - Get with history
- `DELETE /api/cafes/:cafeId/customers/:id` - Delete

**Analytics** (Protected):
- `GET /api/campaigns/:id/analytics` - Campaign stats
- `GET /api/cafes/:cafeId/dashboard` - Dashboard

**Unsubscribe** (Public):
- `GET /public/unsubscribe/:token?email=...` - Unsubscribe page
- `POST /public/webhooks/brevo` - Brevo event webhook

## Database Models

- **User**: Firebase users (id, firebaseId, email, role)
- **Cafe**: Cafe info + owner relation
- **Customer**: Subscribers per cafe
- **Campaign**: Email campaign (subject, content, status)
- **EmailRecipient**: Individual recipient status (pending/sent/failed/blocked)
- **EmailLog**: Complete audit trail (status, error, Brevo response)
- **UnsubscribedEmail**: Unsubscribed addresses (cafe + email + token)
- **DailyLimit**: Per-cafe daily counters
- **GlobalLimit**: Global daily counter

## Queue Configuration

- **Concurrency**: 5 emails processed simultaneously
- **Rate Limit**: 1 email per second (5 emails every 5 seconds)
- **Retry**: 3 attempts with exponential backoff (2s → 4s → 8s)
- **Persistence**: 1 hour job history after completion
- **Dead Letter**: Failed jobs logged to database

## Production Ready Checklist

✅ Modular architecture (services, routes, middleware)
✅ Error handling (try/catch + validation)
✅ Database transactions (atomic operations)
✅ Security (auth, tenant scoping, CORS, Helmet)
✅ Logging (all operations logged)
✅ Rate limiting (3-level enforcement)
✅ Queue reliability (retry, persistence, graceful shutdown)
✅ Type safety (TypeScript)
✅ Environment configuration (no secrets in code)
✅ Documentation (README, integration guide)
✅ Scalability (async, queue-based, stateless API)

## Notes

- All emails sent via Brevo REST API (no SMTP)
- Sender always platform domain (no cafe override)
- Reply-To support for cafe support emails
- Unsubscribe links include token verification
- Brevo webhooks auto-handle bounces/complaints
- Database designed for multi-tenant isolation
- Worker process separate from API (can scale independently)
- All operations idempotent (safe to retry)
