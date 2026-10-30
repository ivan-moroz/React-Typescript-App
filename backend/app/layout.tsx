import type { ReactNode } from "react";
import { headers } from "next/headers";
import type { IncomingMessage } from "node:http";
import ServerNavigation from "../features/navigation/ServerNavigation";
import { getServerNavigationProps } from "../features/navigation/server";
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
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-app-pathname") ??
    requestHeaders.get("x-next-url")?.split("?", 1)[0] ?? "";
  const request = {
    headers: { cookie: requestHeaders.get("cookie") ?? undefined },
  } as IncomingMessage;
  const navigation = await getServerNavigationProps(request, pathname);

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
