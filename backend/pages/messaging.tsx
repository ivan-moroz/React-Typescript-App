import type { GetServerSideProps } from "next";
import { useCallback, useState } from "react";
import MessagingPanel from "../features/messaging/components/MessagingPanel";
import type { MessagingSnapshot } from "../features/messaging/types/types";
import { getInitialMessaging } from "../lib/messagingSSR";
import { getSessionUser } from "../lib/session";
import { ERROR_MESSAGES, HttpError } from "../../src/constants/errors";

export type MessagingPageProps = {
  initialMessaging: MessagingSnapshot;
  returnTo?: "/assets" | "/users";
};

export const getServerSideProps: GetServerSideProps<
  MessagingPageProps
> = async ({ req, res, query, resolvedUrl }) => {
  res.setHeader("Cache-Control", "private, no-store");
  try {
    const user = await getSessionUser(req);
    if (!user)
      return {
        redirect: {
          destination: `/login?from=${encodeURIComponent(resolvedUrl)}`,
          permanent: false,
        },
      };
    const selectedId = query.conversation;
    if (
      selectedId !== undefined &&
      (typeof selectedId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          selectedId,
        ))
    )
      return { notFound: true };
    const initialMessaging = await getInitialMessaging(user, selectedId);
    if (initialMessaging.error) res.statusCode = 503;
    return {
      props: {
        initialMessaging,
        returnTo: query.returnTo === "/users" ? "/users" : "/assets",
      },
    };
  } catch (error) {
    if (error instanceof HttpError && error.status === 404)
      return { notFound: true };
    res.statusCode = 503;
    return {
      props: {
        initialMessaging: {
          user: null,
          conversationPage: {
            conversations: [],
            unreadCount: 0,
            nextCursor: null,
          },
          selectedConversation: null,
          messagePage: null,
          error: ERROR_MESSAGES.MESSAGING_LOAD_FAILED,
        },
      },
    };
  }
};

export default function MessagingPage({
  initialMessaging,
  onMessagingUnread,
  returnTo = "/assets",
}: MessagingPageProps & { onMessagingUnread?: (count: number) => void }) {
  const [expired, setExpired] = useState(false);
  const expire = useCallback(() => setExpired(true), []);
  return (
    <main className="messaging messaging-fullpage">
      <div className="messaging-page-heading">
        <h1>Private messages</h1>
        <a href={`${returnTo}?messaging=panel`}>Return to panel</a>
      </div>
      {initialMessaging.user && !expired ? (
        <MessagingPanel
          user={initialMessaging.user}
          initialData={initialMessaging}
          serverNavigation
          returnTo={returnTo}
          onUnread={onMessagingUnread ?? (() => {})}
          onExpired={expire}
        />
      ) : (
        <div className="messaging-empty">
          {initialMessaging.error && (
            <p role="alert">{initialMessaging.error}</p>
          )}
          <a href="/login?from=/messaging">Log in to view your messages</a>
        </div>
      )}
    </main>
  );
}
