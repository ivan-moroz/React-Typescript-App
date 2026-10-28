CREATE TABLE "conversations" (
  "id" UUID NOT NULL,
  "direct_key" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "conversations_direct_key_key" ON "conversations"("direct_key");
CREATE INDEX "conversations_updated_at_id_idx" ON "conversations"("updated_at", "id");

CREATE TABLE "conversation_participants" (
  "conversation_id" UUID NOT NULL,
  "user_id" INTEGER NOT NULL,
  "last_read_at" TIMESTAMP(3),
  CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("conversation_id", "user_id"),
  CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "conversation_participants_user_id_conversation_id_idx" ON "conversation_participants"("user_id", "conversation_id");

CREATE TABLE "messages" (
  "id" UUID NOT NULL,
  "conversation_id" UUID NOT NULL,
  "sender_id" INTEGER NOT NULL,
  "content" VARCHAR(2000) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "read_at" TIMESTAMP(3),
  CONSTRAINT "messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "messages_content_not_empty" CHECK (length(trim("content")) > 0)
);
CREATE INDEX "messages_conversation_id_created_at_id_idx" ON "messages"("conversation_id", "created_at", "id");
CREATE INDEX "messages_conversation_id_read_at_sender_id_idx" ON "messages"("conversation_id", "read_at", "sender_id");
