"use client";

import { useCallback, useState } from "react";
import MessagingPanel from "./MessagingPanel";
import type { MessagingSnapshot } from "../model/types";

function onUnreadChange(_count: number) {}

export default function MessagingPageClient({
  initialMessaging,
}: {
  initialMessaging: MessagingSnapshot;
}) {
  const [expired, setExpired] = useState(false);
  const expire = useCallback(() => setExpired(true), []);
  return (
    <main className="messaging messaging-fullpage">
      <div className="messaging-page-heading">
        <h1>Private messages</h1>
      </div>
      {initialMessaging.user && !expired ? (
        <MessagingPanel
          key={initialMessaging.selectedConversation?.id ?? "inbox"}
          user={initialMessaging.user}
          initialData={initialMessaging}
          serverNavigation
          onUnread={onUnreadChange}
          onExpired={expire}
        />
      ) : (
        <div className="messaging-empty">
          {initialMessaging.error && <p role="alert">{initialMessaging.error}</p>}
          <a href="/login?from=/messaging">Log in to view your messages</a>
        </div>
      )}
    </main>
  );
}
