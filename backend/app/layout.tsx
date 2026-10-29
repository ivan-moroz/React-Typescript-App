import type { ReactNode } from "react";
import { Suspense } from "react";
import ServerNavigationSSR from "./server-navigation";
import AppProviders from "./providers";
import "../../src/components/messaging/styles/styles.scss";
import "../features/messaging/styles/styles.scss";
import "../../src/styles/index.scss";
import "../../src/styles/App.scss";
import "../features/assets/assets.scss";
import "../features/users/styles/styles.scss";
import "../../src/components/modal/styles/styles.scss";
import "../../src/components/select/styles/styles.scss";
import "../features/navigation/styles/styles.scss";
import "../../src/components/routing/RouteLoading.scss";

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
        />
      </head>
      <body>
        <Suspense fallback={<nav className="app-navigation" aria-label="Main navigation" />}>
          <ServerNavigationSSR />
        </Suspense>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
