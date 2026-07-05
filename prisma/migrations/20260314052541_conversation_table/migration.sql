-- CreateTable
CREATE TABLE "conversation" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "adminTakeover" BOOLEAN NOT NULL DEFAULT false,
    "lastMessageAt" TIMESTAMP(3),
    "lastCustomerMessageAt" TIMESTAMP(3),
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "phoneNumberId" TEXT NOT NULL,

    CONSTRAINT "conversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_conversations_last_message" ON "conversation"("lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_phoneNumberId_contactId_key" ON "conversation"("phoneNumberId", "contactId");

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_phoneNumberId_fkey" FOREIGN KEY ("phoneNumberId") REFERENCES "phone_number"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
