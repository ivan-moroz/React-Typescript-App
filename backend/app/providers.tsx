"use client";

import { ModalProvider } from "../../src/components/modal/ModalProvider";
import MessagingPanelHost from "../features/messaging/MessagingPanelHost";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ModalProvider>
      <div className="page-wrapper">{children}</div>
      <MessagingPanelHost />
    </ModalProvider>
  );
}
