import { headers } from "next/headers";
import type { IncomingMessage } from "node:http";
import ServerNavigation from "../../features/navigation/ServerNavigation";
import { getServerNavigationProps } from "../../features/navigation/server";

export default async function ServerNavigationSSR() {
  const requestHeaders = await headers();
  const pathname =
    requestHeaders.get("x-app-pathname") ??
    requestHeaders.get("x-next-url")?.split("?", 1)[0] ??
    "";
  const request = {
    headers: { cookie: requestHeaders.get("cookie") ?? undefined },
  } as IncomingMessage;
  const navigation = await getServerNavigationProps(request, pathname);
  return <ServerNavigation {...navigation} liveUpdates />;
}
