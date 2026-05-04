-- CreateTable
CREATE TABLE "phone_number" (
    "id" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "displayPhoneNumber" TEXT NOT NULL,
    "verifiedName" TEXT,
    "registrationPin" TEXT,
    "codeVerificationStatus" TEXT NOT NULL DEFAULT 'VERIFIED',
    "qualityRating" TEXT,
    "botEnabled" BOOLEAN NOT NULL DEFAULT true,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "wabaId" TEXT NOT NULL,

    CONSTRAINT "phone_number_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "phone_number_phoneNumberId_key" ON "phone_number"("phoneNumberId");

-- CreateIndex
CREATE INDEX "idx_phone_number_wabaId" ON "phone_number"("wabaId");

-- AddForeignKey
ALTER TABLE "phone_number" ADD CONSTRAINT "phone_number_wabaId_fkey" FOREIGN KEY ("wabaId") REFERENCES "whatsapp_business_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
