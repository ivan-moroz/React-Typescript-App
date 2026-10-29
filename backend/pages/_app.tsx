import "../../src/components/messaging/styles/styles.scss";
import MessagingPanelHost from "../features/messaging/MessagingPanelHost";
import "../features/messaging/styles/styles.scss";
import type { AppProps } from "next/app";
import type { MessagingSnapshot } from "../features/messaging/types/types";
import { useEffect, useState } from "react";
import { ModalProvider } from "../../src/components/modal/ModalProvider";
import "../../src/styles/index.scss";
import "../../src/styles/App.scss";
import "../features/assets/assets.scss";
import "../features/users/styles/styles.scss";
import "../../src/components/modal/styles/styles.scss";
import "../../src/components/select/styles/styles.scss";
import "../features/navigation/styles/styles.scss";

export default function App({ Component, pageProps, router }: AppProps) {
  const [showMessagingPanel, setShowMessagingPanel] = useState(false);
  useEffect(() => {
    if (!router.isReady || router.query.messaging !== "panel") return;
    setShowMessagingPanel(true);
    const { messaging: _messaging, ...query } = router.query;
    void router.replace({ pathname: router.pathname, query }, undefined, {
      shallow: true,
      scroll: false,
    });
  }, [router]);

  const ssrPage = ["/assets", "/users", "/messaging"].includes(router.pathname);
  if (!ssrPage) return <Component {...pageProps} />;
  const supportsMessagingPanel = ["/assets", "/users"].includes(router.pathname);
  const snapshot: MessagingSnapshot = pageProps.initialMessaging ?? {
    user: null,
    conversationPage: { conversations: [], unreadCount: 0, nextCursor: null },
    selectedConversation: null,
    messagePage: null,
    error: "",
  };
  return (
    <ModalProvider>
      <div className="page-wrapper">
        <Component {...pageProps} />
      </div>
      <MessagingPanelHost
        initialData={snapshot}
        initialOpen={supportsMessagingPanel && showMessagingPanel}
        returnTo={router.pathname === "/users" ? "/users" : "/assets"}
      />
    </ModalProvider>
  );
}
