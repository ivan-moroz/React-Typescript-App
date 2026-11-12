"use client";

import LoginPage from "../../features/auth/ui/Login";

export default function LoginRouteClient({ from }: { from?: string | null }) {
  return <LoginPage from={from} onNavigate={(href) => window.location.assign(href)} />;
}
