import "../../src/components/messaging/styles/styles.scss";
import MessagingPanelHost from "../features/messaging/MessagingPanelHost";
import RegistrationModalHost from "../features/users/RegistrationModalHost";
import type { MessagingSnapshot } from "../features/messaging/types/types";
import { createEmptyMessagingSnapshot } from "../features/messaging/utils/utils";
import "../features/messaging/styles/styles.scss";
import type { AppProps } from "next/app";
import { ModalProvider } from "../../src/components/modal/ModalProvider";
import "../../src/styles/index.scss";
import "../../src/styles/App.scss";
import "../features/assets/styles/styles.scss";
import "../features/users/styles/styles.scss";
import "../../src/components/modal/styles/styles.scss";
import "../../src/components/select/styles/styles.scss";
import "../features/navigation/styles/styles.scss";

export default function App({ Component, pageProps, router }: AppProps) {
  const ssrPage = ["/assets", "/users", "/messaging"].includes(router.pathname);
  const snapshot: MessagingSnapshot =
    pageProps.initialMessaging ?? createEmptyMessagingSnapshot(null);
  return (
    <ModalProvider>
      <RegistrationModalHost />
      {ssrPage ? (
        <>
          <div className="page-wrapper">
            <Component {...pageProps} />
          </div>
          <MessagingPanelHost initialData={snapshot} />
        </>
      ) : (
        <Component {...pageProps} />
      )}
    </ModalProvider>
  );
}
