-- AlterTable
ALTER TABLE "Session" ALTER COLUMN "userId" DROP NOT NULL,
ALTER COLUMN "oauth2:state" DROP NOT NULL;