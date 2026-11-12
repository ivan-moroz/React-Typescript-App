"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function NavigationCurrentPage() {
  const pathname = usePathname();

  useEffect(() => {
    document.querySelectorAll<HTMLAnchorElement>(".app-navigation .navigation-links a").forEach((link) => {
      if (link.pathname === pathname) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }, [pathname]);

  return null;
}
