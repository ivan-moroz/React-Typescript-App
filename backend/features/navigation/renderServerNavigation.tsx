import { renderToStaticMarkup } from "react-dom/server";
import type { IncomingMessage } from "node:http";
import ServerNavigation from "./ServerNavigation";
import { getServerNavigationProps } from "./server";

export async function renderServerNavigation(req: IncomingMessage, asPath: string) {
  const props = await getServerNavigationProps(req, asPath);
  return renderToStaticMarkup(<ServerNavigation {...props} />);
}
