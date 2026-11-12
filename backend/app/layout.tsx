import type { ReactNode } from "react";
import ServerNavigation from "../features/navigation/ServerNavigation";
import { getAppNavigationProps } from "./navigation/server-props";
import AppProviders from "./providers";
import "../features/messaging/styles/styles.scss";
import "./styles/index.scss";
import "./styles/App.scss";
import "../features/assets/styles/styles.scss";
import "../features/users/styles/styles.scss";
import "../shared/ui/modal/styles/styles.scss";
import "../shared/ui/select/styles/styles.scss";
import "../features/navigation/styles/styles.scss";
import "./loading/loading.scss";

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const navigation = await getAppNavigationProps();

  return (
    <html lang="en">
      <head>
        <title>V Studio</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
        />
      </head>
      <body>
        <AppProviders userId={navigation.user?.id ?? null}>
          <ServerNavigation {...navigation} liveUpdates />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
