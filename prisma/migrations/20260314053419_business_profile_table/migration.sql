-- CreateTable
CREATE TABLE "business_profile" (
    "id" TEXT NOT NULL,
    "address" TEXT,
    "description" TEXT,
    "vertical" TEXT,
    "about" TEXT,
    "email" TEXT,
    "websites" TEXT[],
    "profilePictureUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "phoneNumberId" TEXT NOT NULL,

    CONSTRAINT "business_profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_profile_phoneNumberId_key" ON "business_profile"("phoneNumberId");

-- AddForeignKey
ALTER TABLE "business_profile" ADD CONSTRAINT "business_profile_phoneNumberId_fkey" FOREIGN KEY ("phoneNumberId") REFERENCES "phone_number"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
