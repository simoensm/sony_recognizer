-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('none', 'processing', 'ready', 'failed');

-- AlterTable
ALTER TABLE "event_participants" ADD COLUMN     "enrollment_error" TEXT,
ADD COLUMN     "enrollment_status" "EnrollmentStatus" NOT NULL DEFAULT 'none';
