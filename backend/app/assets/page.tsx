import { Suspense } from "react";
import AssetsPage from "../../features/assets/AssetsPage";
import { loadAssetsPage } from "../../features/assets/server/loadAssetsPage";
import { headers } from "next/headers";
import { RouteLoading } from "../route-loading";

export const dynamic = "force-dynamic";

async function AssetsContent() {
  const cookie = (await headers()).get("cookie") ?? undefined;
  const props = await loadAssetsPage(cookie);
  return <AssetsPage {...props} />;
}

export default function AssetsRoute() {
  return <Suspense fallback={<RouteLoading label="Loading assets…" />}><AssetsContent /></Suspense>;
}
