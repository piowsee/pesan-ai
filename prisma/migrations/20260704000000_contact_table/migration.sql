-- CreateTable
CREATE TABLE "contact" (
    "id" TEXT NOT NULL,
    "bsuid" TEXT,
    "customerPhone" TEXT,
    "customerName" TEXT,
    "customerUsername" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contact_bsuid_key" ON "contact"("bsuid");

-- CreateIndex
CREATE UNIQUE INDEX "contact_customerPhone_key" ON "contact"("customerPhone");

-- CreateIndex
CREATE INDEX "idx_contact_customer_username" ON "contact"("customerUsername");

-- CreateIndex
CREATE INDEX "idx_conversations_contact_id" ON "conversation"("contactId");

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
