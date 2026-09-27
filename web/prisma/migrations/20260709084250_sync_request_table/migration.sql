-- CreateTable
CREATE TABLE "sync_request" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "phoneNumberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sync_request_requestId_key" ON "sync_request"("requestId");

-- CreateIndex
CREATE INDEX "idx_sync_request_phone_number_id" ON "sync_request"("phoneNumberId");

-- AddForeignKey
ALTER TABLE "sync_request" ADD CONSTRAINT "sync_request_phoneNumberId_fkey" FOREIGN KEY ("phoneNumberId") REFERENCES "phone_number"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
