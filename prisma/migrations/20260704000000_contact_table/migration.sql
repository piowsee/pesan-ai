-- CreateTable
CREATE TABLE "contact" (
    "id" TEXT NOT NULL,
    "bsuid" TEXT,
    "customerPhone" TEXT,
    "customerName" TEXT,
    "customerUsername" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "phoneNumberId" TEXT NOT NULL,

    CONSTRAINT "contact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contact_phoneNumberId_bsuid_key" ON "contact"("phoneNumberId", "bsuid");

-- CreateIndex
CREATE UNIQUE INDEX "contact_phoneNumberId_customerPhone_key" ON "contact"("phoneNumberId", "customerPhone");

-- AddForeignKey
ALTER TABLE "contact" ADD CONSTRAINT "contact_phoneNumberId_fkey" FOREIGN KEY ("phoneNumberId") REFERENCES "phone_number"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
