-- AlterTable
ALTER TABLE "file" ADD COLUMN     "thumbnail_id" INTEGER;

-- AddForeignKey
ALTER TABLE "file" ADD CONSTRAINT "file_thumbnail_id_fkey" FOREIGN KEY ("thumbnail_id") REFERENCES "file"("id") ON DELETE SET NULL ON UPDATE CASCADE;
