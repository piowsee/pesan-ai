-- AlterTable
ALTER TABLE "phone_number" ADD COLUMN     "botWebhookId" TEXT;

-- CreateTable
CREATE TABLE "bot_webhook" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "webhookUrl" TEXT NOT NULL,
    "passphrase" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "bot_webhook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_bot_webhooks_userId" ON "bot_webhook"("userId");

-- AddForeignKey
ALTER TABLE "phone_number" ADD CONSTRAINT "phone_number_botWebhookId_fkey" FOREIGN KEY ("botWebhookId") REFERENCES "bot_webhook"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_webhook" ADD CONSTRAINT "bot_webhook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
