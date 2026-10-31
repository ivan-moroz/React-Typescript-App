import { headers } from "next/headers";
import type { IncomingMessage } from "node:http";
import { getServerNavigationProps } from "../../features/navigation/server";

export async function getAppNavigationProps() {
  const requestHeaders = await headers();
  const pathname =
    requestHeaders.get("x-app-pathname") ??
    requestHeaders.get("x-next-url")?.split("?", 1)[0] ??
    "";
  const request = {
    headers: { cookie: requestHeaders.get("cookie") ?? undefined },
  } as IncomingMessage;

  return getServerNavigationProps(request, pathname);
}
