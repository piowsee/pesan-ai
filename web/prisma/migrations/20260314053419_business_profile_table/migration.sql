-- CreateTable
CREATE TABLE "business_profile" (
    "id" TEXT NOT NULL,
    "messagingProduct" TEXT NOT NULL,
    "address" TEXT,
    "description" TEXT,
    "vertical" TEXT,
    "about" TEXT,
    "email" TEXT,
    "websites" TEXT[],
    "profilePictureUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_profile_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "phone_number" ADD CONSTRAINT "phone_number_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "business_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
