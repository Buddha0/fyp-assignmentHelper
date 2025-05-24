/*
  Warnings:

  - You are about to drop the column `feedback` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the `Ticket` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TicketAttachment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TicketMessage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_userId_fkey";

-- DropForeignKey
ALTER TABLE "TicketAttachment" DROP CONSTRAINT "TicketAttachment_messageId_fkey";

-- DropForeignKey
ALTER TABLE "TicketAttachment" DROP CONSTRAINT "TicketAttachment_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "TicketMessage" DROP CONSTRAINT "TicketMessage_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "TicketMessage" DROP CONSTRAINT "TicketMessage_userId_fkey";

-- AlterTable
ALTER TABLE "Submission" DROP COLUMN "feedback";

-- DropTable
DROP TABLE "Ticket";

-- DropTable
DROP TABLE "TicketAttachment";

-- DropTable
DROP TABLE "TicketMessage";

-- DropEnum
DROP TYPE "TicketStatus";
