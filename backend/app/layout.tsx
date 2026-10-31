import type { ReactNode } from "react";
import ServerNavigation from "../features/navigation/ServerNavigation";
import { getAppNavigationProps } from "./navigation/server-props";
import AppProviders from "./providers";
import "../../src/components/messaging/styles/styles.scss";
import "../features/messaging/styles/styles.scss";
import "../../src/styles/index.scss";
import "../../src/styles/App.scss";
import "../features/assets/styles/styles.scss";
import "../features/users/styles/styles.scss";
import "../../src/components/modal/styles/styles.scss";
import "../../src/components/select/styles/styles.scss";
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
        <ServerNavigation {...navigation} liveUpdates />
        <AppProviders userId={navigation.user?.id ?? null}>{children}</AppProviders>
      </body>
    </html>
  );
}
