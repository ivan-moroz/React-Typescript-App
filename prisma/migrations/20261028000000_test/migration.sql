-- DropForeignKey
ALTER TABLE "assets" DROP CONSTRAINT "assets_user_id_fkey";

-- DropIndex
DROP INDEX "assets_authorization_created_at_idx";

-- DropIndex
DROP INDEX "assets_user_id_created_at_idx";

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "assets_user_id_created_at_idx" ON "assets"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
