-- CreateUser
CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "firebaseId" TEXT NOT NULL UNIQUE,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT,
  "role" TEXT NOT NULL DEFAULT 'user',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateCafe
CREATE TABLE "Cafe" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "supportEmail" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Cafe_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Cafe_ownerId_idx" ON "Cafe"("ownerId");

-- CreateCustomer
CREATE TABLE "Customer" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cafeId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Customer_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Customer_cafeId_email_key" UNIQUE("cafeId", "email")
);

CREATE INDEX "Customer_cafeId_idx" ON "Customer"("cafeId");

-- CreateCampaign
CREATE TABLE "Campaign" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "createdBy" TEXT NOT NULL,
  "cafeId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "htmlContent" TEXT NOT NULL,
  "textContent" TEXT NOT NULL,
  "recipientCount" INTEGER NOT NULL DEFAULT 0,
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "scheduledAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Campaign_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Campaign_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Campaign_cafeId_idx" ON "Campaign"("cafeId");
CREATE INDEX "Campaign_createdBy_idx" ON "Campaign"("createdBy");

-- CreateEmailRecipient
CREATE TABLE "EmailRecipient" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "brevoMessageId" TEXT,
  "failureReason" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EmailRecipient_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EmailRecipient_campaignId_customerId_key" UNIQUE("campaignId", "customerId")
);

CREATE INDEX "EmailRecipient_campaignId_idx" ON "EmailRecipient"("campaignId");
CREATE INDEX "EmailRecipient_customerId_idx" ON "EmailRecipient"("customerId");

-- CreateEmailLog
CREATE TABLE "EmailLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "cafeId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "brevoMessageId" TEXT,
  "brevoResponse" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EmailLog_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "EmailLog_campaignId_idx" ON "EmailLog"("campaignId");
CREATE INDEX "EmailLog_cafeId_idx" ON "EmailLog"("cafeId");
CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");

-- CreateUnsubscribedEmail
CREATE TABLE "UnsubscribedEmail" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cafeId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "unsubscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UnsubscribedEmail_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UnsubscribedEmail_cafeId_email_key" UNIQUE("cafeId", "email")
);

CREATE INDEX "UnsubscribedEmail_cafeId_idx" ON "UnsubscribedEmail"("cafeId");

-- CreateDailyLimit
CREATE TABLE "DailyLimit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cafeId" TEXT NOT NULL UNIQUE,
  "date" TIMESTAMP(3) NOT NULL,
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DailyLimit_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "DailyLimit_cafeId_date_idx" ON "DailyLimit"("cafeId", "date");

-- CreateGlobalLimit
CREATE TABLE "GlobalLimit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "date" TIMESTAMP(3) NOT NULL UNIQUE,
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "GlobalLimit_date_idx" ON "GlobalLimit"("date");
