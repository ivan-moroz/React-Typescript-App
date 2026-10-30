"use client";

import { ModalProvider } from "../../src/components/modal/ModalProvider";
import { fetchData } from "../../src/utils/fetchData";
import MessagingPanelHost from "../features/messaging/MessagingPanelHost";
import { subscribeMessagingRealtime } from "../features/messaging/client/realtime";
import NavigationCurrentPage from "./navigation/navigation-current";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";

function MessagingRealtimeBridge({ userId }: { userId: number | null }) {
  useEffect(() => {
    if (!userId) return;
    // This root-level subscriber keeps the socket alive independently of the
    // navigation or messaging panel mount lifecycle.
    return subscribeMessagingRealtime(() => {});
  }, [userId]);

  return null;
}

export default function AppProviders({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId: number | null;
}) {
  const router = useRouter();
  const navigate = useCallback((href: string) => {
    const url = new URL(href, window.location.origin);
    if (url.searchParams.get("messaging") === "panel") {
      url.searchParams.delete("messaging");
      window.dispatchEvent(new Event("messaging:open"));
    }
    router.push(`${url.pathname}${url.search}${url.hash}`);
  }, [router]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.hasAttribute("download") || anchor.target || anchor.hasAttribute("data-open-messaging-panel")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || /\.[a-z\d]{2,8}$/i.test(url.pathname)) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return;
      event.preventDefault();
      navigate(`${url.pathname}${url.search}${url.hash}`);
    };
    const handleAppNavigate = (event: Event) => {
      const href = (event as CustomEvent<string>).detail;
      if (typeof href === "string") navigate(href);
    };
    document.addEventListener("click", handleClick);
    window.addEventListener("app:navigate", handleAppNavigate);
    return () => {
      document.removeEventListener("click", handleClick);
      window.removeEventListener("app:navigate", handleAppNavigate);
    };
  }, [navigate]);

  useEffect(() => {
    const handleLogout = async (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || new URL(form.action).pathname !== "/api/auth/logout") return;
      event.preventDefault();
      const body = new URLSearchParams();
      for (const [key, value] of new FormData(form)) {
        if (typeof value === "string") body.append(key, value);
      }
      const result = await fetchData(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        responseType: "response",
      });
      if (!result.success) {
        form.submit();
        return;
      }
      const destination = new URL(result.data.url).pathname + new URL(result.data.url).search;
      router.push(destination);
      router.refresh();
    };
    document.addEventListener("submit", handleLogout);
    return () => document.removeEventListener("submit", handleLogout);
  }, [router]);

  useEffect(() => {
    const current = new URL(window.location.href);
    if (current.searchParams.get("messaging") !== "panel") return;
    current.searchParams.delete("messaging");
    window.history.replaceState(window.history.state, "", current);
    window.dispatchEvent(new Event("messaging:open"));
  }, []);

  return (
    <ModalProvider>
      <MessagingRealtimeBridge userId={userId} />
      {children}
      <NavigationCurrentPage />
      <MessagingPanelHost />
    </ModalProvider>
  );
}
