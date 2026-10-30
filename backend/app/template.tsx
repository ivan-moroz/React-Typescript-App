import type { ReactNode } from "react";

export default function RouteTemplate({ children }: { children: ReactNode }) {
  return <div className="page-wrapper">{children}</div>;
}
