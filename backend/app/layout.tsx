import type { Metadata } from "next";
import type { ReactNode } from "react";
import ServerNavigation from "../features/navigation/ui/ServerNavigation";
import { getAppNavigationProps } from "./navigation/server-props";
import AppProviders from "./providers";
import "../features/messaging/styles/messaging.scss";
import "./styles/index.scss";
import "./styles/App.scss";
import "../shared/ui/modal/styles/styles.scss";
import "../shared/ui/select/styles/styles.scss";
import "../features/navigation/styles/navigation.scss";
import "./loading/loading.scss";

export const metadata: Metadata = {
  title: "V Studio",
  icons: { icon: "/favicon.svg" },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const navigation = await getAppNavigationProps();

  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
        />
      </head>
      <body>
        <AppProviders userId={navigation.user?.id ?? null}>
          <ServerNavigation {...navigation} liveUpdates />
          <div className="page-wrapper">{children}</div>
        </AppProviders>
      </body>
    </html>
  );
}
