-- DropForeignKey
ALTER TABLE "asset_chunks" DROP CONSTRAINT "asset_chunks_asset_id_fkey";

-- AddForeignKey
ALTER TABLE "asset_chunks" ADD CONSTRAINT "asset_chunks_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
