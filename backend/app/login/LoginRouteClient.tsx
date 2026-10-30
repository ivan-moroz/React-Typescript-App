"use client";

import { useRouter } from "next/navigation";
import LoginPage from "../../../src/pages/Login";

export default function LoginRouteClient({ from }: { from?: string | null }) {
  const router = useRouter();
  return <LoginPage from={from} onNavigate={(href) => { router.push(href); router.refresh(); }} />;
}
