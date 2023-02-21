/*
  Warnings:

  - You are about to drop the column `oauth2:state` on the `Session` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Session" DROP COLUMN "oauth2:state",
ADD COLUMN     "json" JSONB;
