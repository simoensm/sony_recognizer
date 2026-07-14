-- AlterTable
ALTER TABLE "ftp_credentials" ADD COLUMN     "last_login_at" TIMESTAMP(3),
ADD COLUMN     "last_upload_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "photos" ADD COLUMN     "ftp_credential_id" TEXT;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_ftp_credential_id_fkey" FOREIGN KEY ("ftp_credential_id") REFERENCES "ftp_credentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
