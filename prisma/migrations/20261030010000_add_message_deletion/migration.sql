ALTER TABLE "messages" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_content_not_empty";
ALTER TABLE "messages" ADD CONSTRAINT "messages_content_not_empty"
  CHECK (("deleted_at" IS NOT NULL AND "content" = '') OR ("deleted_at" IS NULL AND length(trim("content")) > 0));
