import { Suspense } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import MessagingPageClient from "../../features/messaging/MessagingPageClient";
import { loadMessagingPage } from "../../features/messaging/server/loadMessagingPage";
import { RouteLoading } from "../loading/route-loading";

export const dynamic = "force-dynamic";

type Query = { conversation?: string | string[] };

async function MessagingContent({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const cookie = (await headers()).get("cookie") ?? undefined;
  const result = await loadMessagingPage(cookie, query);
  if (result.kind === "redirect") redirect(result.destination);
  if (result.kind === "notFound") notFound();
  return <MessagingPageClient initialMessaging={result.initialMessaging} />;
}

export default function MessagingRoute({ searchParams }: { searchParams: Promise<Query> }) {
  return <Suspense fallback={<RouteLoading label="Loading messages…" />}><MessagingContent searchParams={searchParams} /></Suspense>;
}
