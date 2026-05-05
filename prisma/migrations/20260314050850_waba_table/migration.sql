-- CreateTable
CREATE TABLE "whatsapp_business_account" (
    "id" TEXT NOT NULL,
    "wabaId" TEXT NOT NULL,
    "businessName" TEXT,
    "businessAddress" TEXT,
    "businessDescription" TEXT,
    "systemUserToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "qualityRating" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "whatsapp_business_account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_business_account_wabaId_key" ON "whatsapp_business_account"("wabaId");

-- CreateIndex
CREATE INDEX "idx_waba_userId" ON "whatsapp_business_account"("userId");

-- AddForeignKey
ALTER TABLE "whatsapp_business_account" ADD CONSTRAINT "whatsapp_business_account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
