# Private messaging

The Next.js App Router renders the shared site navigation and messaging pages. Internal navigation keeps the shared shell mounted and loads only the destination content. The messaging icon opens the panel in place without changing the current URL; the panel links to the full `/messaging` inbox. The complete messaging interface lives in `backend/features/messaging`; it supports searching names, starting a conversation, reading and paginating history, and sending plain-text messages.

## Setup

Stop running Next.js/backend processes before regenerating Prisma on Windows; a running process can lock `query_engine-windows.dll.node` and cause `EPERM`.

From the project root, with PostgreSQL available and `DATABASE_URL` configured:

```powershell
npm run prisma:generate
npx prisma migrate deploy
```

The included migration is `prisma/migrations/20261030000000_add_messaging/migration.sql`. `migrate deploy` applies pending migrations without resetting existing data. No migration was applied automatically during implementation.

Start the full application for development:

```powershell
npm run dev
```

For production, build and start the Next.js application:

```powershell
npm run build
npm run start:backend
```

## Database

- `Conversation`: UUID, canonical unique `directKey`, creation/update timestamps. The key sorts the two user IDs, so both directions resolve to one conversation. Concurrent creation is handled by the unique constraint and retry lookup.
- `ConversationParticipant`: composite primary key `(conversationId, userId)`, nullable `lastReadAt`, foreign keys to users and conversations.
- `Message`: UUID, conversation, authenticated sender, content limited to 2000 characters, creation timestamp, nullable `readAt`. Because chats have two participants, `readAt` represents the recipient reading the message.
- Indexes support membership lookups, conversation ordering, message pagination, and unread queries. Foreign keys cascade on deletion. If a user is deleted, the remaining participant sees “Deleted user” and cannot send more messages in that conversation.

## API

All messaging routes require the existing signed `app_session` cookie. IDs from browser storage or request bodies are never trusted as the sender. Responses use `Cache-Control: private, no-store`; messaging APIs do not enable wildcard CORS. Mutations reject mismatched origins.

| Method | Route                                                   | Request / response                                                              |
| ------ | ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| GET    | `/api/auth/session`                                     | Current `{ id, name }` or `null`                                                |
| GET    | `/api/messaging/conversations?cursor=UUID`              | 30 conversation summaries, unread total, next cursor                            |
| POST   | `/api/messaging/conversations`                          | `{ userId }`; creates or returns the direct conversation                        |
| GET    | `/api/messaging/conversations/:id/messages`             | Latest 40 messages in chronological order                                       |
| GET    | `/api/messaging/conversations/:id/messages?before=UUID` | Up to 40 older messages                                                         |
| GET    | `/api/messaging/conversations/:id/messages?after=UUID`  | Up to 40 newer messages in chronological order                                  |
| POST   | `/api/messaging/conversations/:id/messages`             | `{ content }`; returns the persisted message                                    |
| POST   | `/api/messaging/conversations/:id/read`                 | `{ messageId }`; marks received messages through that displayed message as read |
| GET    | `/api/messaging/unread`                                 | `{ unreadCount }`                                                               |
| GET    | `/api/messaging/users?q=name`                           | Up to 20 `{ id, name }` matches; search length 2–100                            |

Message pagination uses `(createdAt, id)` ordering, validates that the cursor belongs to the requested conversation, and rejects simultaneous `before` and `after`. A missing or inaccessible conversation returns 404 without exposing membership or content. Message sending requires two current participants and runs with the conversation timestamp update in a transaction.

## Server rendering

`backend/app/messaging/page.tsx` authenticates the cookie and loads conversations, unread counts, and optionally message history on the server. Open `/messaging?conversation=UUID` for server-rendered chat history. Conversation links on the full inbox request that route. Anonymous visitors redirect to login; inaccessible conversations return 404. Responses are private and uncached.

`backend/features/messaging/server/messagingSSR.ts` reads Prisma through the existing messaging service, serializes dates, and strips session secrets. The initial inbox and badge render into HTML before JavaScript; selected history hydrates without refetching it on mount. Later updates arrive over the authenticated WebSocket connection. Timestamps explicitly use UTC to avoid timezone hydration differences. Errors in messaging do not break page rendering.

## Updates and UI

The custom Node.js server exposes an authenticated, same-origin WebSocket at `/api/messaging/socket`. It validates the existing HttpOnly session cookie before associating a connection with a user. Messaging mutations publish conversation-scoped update events to the involved users; clients refresh only the affected conversation or unread count. One shared browser connection is used, reconnecting with capped exponential backoff. No periodic unread, conversation, or message polling is used. HTTP remains responsible for initial SSR, search, pagination, and mutations.

The chat receive cursor is independent of locally sent messages, preventing incoming messages from being skipped during concurrent sending. Read markers are bounded by the messages fetched, rather than a client-supplied timestamp. React renders message content as text; no message HTML is executed. Sending failures retain the draft. Escape and outside clicks close the panel; mobile uses a viewport-sized panel.

## Verification

```powershell
npm test
npx tsc --noEmit --incremental false -p backend/tsconfig.json
npx prisma validate
npm run build
npm run build:backend
```

`backend/test/MessagingSSR.test.tsx` verifies server-loaded history, JSON serialization, header HTML, hydration without initial refetches, login redirects, private conversation access, and server errors.

`backend/test/MessagingApi.test.ts` verifies authentication, membership, sender identity, private search, validation, pagination, read boundaries, duplicate-pair keys, origin checks, WebSocket update publishing, and sanitized server failures. `backend/features/messaging/test/realtime.test.ts` verifies shared WebSocket connections and reconnects. `backend/features/messaging/test/Messaging.test.tsx` verifies conversations, sending, safe rendering, search, anonymous state, live deletion updates, and a concurrent-send receive-cursor regression.

After migration, test with two different accounts in separate browser profiles: start a conversation, exchange messages, close one panel to check the badge, reopen to clear unread state, and load older history. API tests mock Prisma; live PostgreSQL and desktop/mobile browser integration still require this check.

## Files

Created:

- `backend/features/messaging/server/messaging.ts`
- `backend/features/messaging/server/messagingSSR.ts`
- `backend/app/messaging/page.tsx`
- `backend/test/MessagingSSR.test.tsx`
- `src/components/messaging/Messaging.tsx`
- `src/components/messaging/styles/styles.scss`
- `backend/pages/api/auth/session.ts`
- `backend/pages/api/messaging/[[...route]].ts`
- `backend/test/MessagingApi.test.ts`
- `prisma/migrations/20261030000000_add_messaging/migration.sql`
- `backend/features/messaging/`: `Messaging.tsx`, `time.ts`
- `backend/features/messaging/hooks/`: `useChatMessages.ts`
- `backend/features/messaging/client/realtime.ts`
- `backend/features/messaging/server/realtime.ts`
- `backend/server.mjs`
- `backend/features/messaging/components/`: `MessagingPanel.tsx`, `ConversationList.tsx`, `ChatThread.tsx`
- `backend/features/messaging/test/Messaging.test.tsx`
- `backend/features/messaging/types/types.ts`
- `backend/features/messaging/styles/styles.scss`
- `backend/features/navigation/ServerNavigation.tsx`
- `backend/features/navigation/server.tsx`

Modified:

- `prisma/schema.prisma`
- `backend/app/layout.tsx`
- `backend/app/providers.tsx`
- `backend/app/assets/page.tsx`
- `backend/app/users/page.tsx`
- `backend/app/messaging/page.tsx`
- `backend/features/navigation/ServerNavigation.tsx`
- `src/pages/Login.tsx`
- `src/App.tsx`
- `backend/features/navigation/styles/styles.scss`
- `vite.config.ts`
- `backend/pages/api/auth/logout.ts`
- `src/constants/errors.ts`
- `src/main.tsx`
- `README.md`

## Deleting messages and conversations

Senders can delete their own messages using the trash icon beside the message. A confirmation dialog explains that deletion applies to both participants. The original content is cleared in PostgreSQL and replaced in the UI by “Message deleted”; a `deletedAt` tombstone preserves pagination cursors. Deleted messages are excluded from unread counts. WebSocket events synchronize deletion IDs within the loaded history window, including older messages already on screen.

Either participant can delete a conversation from its list entry or chat header after confirmation. This permanently removes the conversation, participants, and message history through cascading foreign keys. Only conversation members can do so. Other sessions remove the conversation when its WebSocket update arrives; an open deleted chat returns to the conversation list. A subsequent chat between those users creates a new, empty conversation.

New endpoints:

- `DELETE /api/messaging/conversations/:id/messages/:messageId` — sender-only redaction; 204 on success.
- `DELETE /api/messaging/conversations/:id` — participant-only deletion for both users; 204 on success.

Apply `prisma/migrations/20261030010000_add_message_deletion/migration.sql` before using the updated messaging feature:

```powershell
npm run prisma:generate
npx prisma migrate deploy
```

The migration adds nullable `messages.deleted_at` and updates the content constraint to allow empty content only for redacted messages. No migration is applied automatically.

## Initial limitations

The WebSocket event hub is process-local and requires one persistent Node.js server; horizontal scaling requires shared pub/sub. No push notifications, typing indicators, attachments, group chats, or message editing are implemented. This feature does not add a distributed rate limiter. The database migration is required before accessing messaging. On Windows, close the running backend before regenerating Prisma if its engine is locked.
