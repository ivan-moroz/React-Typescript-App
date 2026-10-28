import "../../src/components/messaging/styles/styles.scss";
import { fetchData } from "../../src/utils/fetchData";
import Messaging from "../features/messaging/Messaging";
import "../features/messaging/styles/styles.scss";
import type { AppProps } from "next/app";
import { useEffect, useState } from "react";
import type { MessagingSnapshot } from "../features/messaging/types/types";
import { ModalProvider } from "../../src/components/modal/ModalProvider";
import "../../src/styles/index.scss";
import "../../src/styles/App.scss";
import "../styles/assets.scss";
import "../features/users/styles/styles.scss";
import "../../src/components/modal/styles/styles.scss";
import "../../src/components/select/styles/styles.scss";
import "../../src/components/navigation/styles/styles.scss";

export default function App({ Component, pageProps, router }: AppProps) {
  const snapshot: MessagingSnapshot = pageProps.initialMessaging ?? {
    user: null,
    conversationPage: { conversations: [], unreadCount: 0, nextCursor: null },
    selectedConversation: null,
    messagePage: null,
    error: "",
  };
  const [unread, setUnread] = useState(snapshot.conversationPage.unreadCount);
  useEffect(() => {
    setUnread(pageProps.initialMessaging?.conversationPage.unreadCount ?? 0);
  }, [pageProps.initialMessaging]);
  const ssrPage = ["/assets", "/users", "/messaging"].includes(router.pathname);
  if (!ssrPage) return <Component {...pageProps} />;
  const from = encodeURIComponent(router.asPath);
  return (
    <ModalProvider>
      <nav>
        {Object.entries({
          "/": "Home",
          "/todo": "ToDo",
          "/select": "Select",
          "/calculator": "Calculator",
          "/puzzle": "Puzzle",
          "/users": "Users",
          "/assets": "Assets",
        }).map(([href, label]) => (
          <a
            key={href}
            href={href}
            aria-current={router.pathname === href ? "page" : undefined}
            style={{ fontWeight: router.pathname === href ? "bold" : "normal" }}
          >
            {label}
          </a>
        ))}
        <div className="header-account">
          {snapshot.user ? (
            <div className="authenticated-user">
              <b>{snapshot.user.name}</b>
              <button
                type="button"
                onClick={async () => {
                  const result = await fetchData("/api/auth/logout", {
                    method: "POST",
                    responseType: "void",
                  });
                  if (!result.success) return;
                  sessionStorage.removeItem("authenticatedUser");
                  window.location.assign(`/login?from=${from}`);
                }}
              >
                Log out
              </button>
            </div>
          ) : (
            <a href={`/login?from=${from}`}>Login</a>
          )}
          {router.pathname === "/messaging" ? (
            <a
              href="/messaging"
              className="messages-link"
              aria-label={`Messages${unread ? `, ${unread} unread` : ""}`}
            >
              <span className="material-icons" aria-hidden="true">
                chat_bubble_outline
              </span>
              {unread > 0 && (
                <span className="messages-link-badge">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </a>
          ) : (
            <Messaging
              key={router.asPath}
              initialData={snapshot}
              initialOpen={router.query.messaging === "panel"}
              returnTo={router.pathname === "/users" ? "/users" : "/assets"}
            />
          )}
        </div>
      </nav>
      <div className="page-wrapper">
        <Component {...pageProps} onMessagingUnread={setUnread} />
      </div>
    </ModalProvider>
  );
}
