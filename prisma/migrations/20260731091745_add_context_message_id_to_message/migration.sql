-- AlterTable
ALTER TABLE "message" ADD COLUMN     "contextMessageId" TEXT;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_contextMessageId_fkey" FOREIGN KEY ("contextMessageId") REFERENCES "message"("messageId") ON DELETE SET NULL ON UPDATE CASCADE;
