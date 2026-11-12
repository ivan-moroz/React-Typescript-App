import { headers } from "next/headers";
import { getServerNavigationProps } from "../../features/navigation/server";

export async function getAppNavigationProps() {
  const requestHeaders = await headers();
  const pathname =
    requestHeaders.get("x-app-pathname") ??
    requestHeaders.get("x-next-url")?.split("?", 1)[0] ??
    "";
  return getServerNavigationProps(requestHeaders.get("cookie") ?? undefined, pathname);
}
