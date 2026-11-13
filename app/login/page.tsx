import { Suspense } from "react";
import "../../features/auth/styles/login.scss";
import LoginRouteClient from "./LoginRouteClient";
import RouteLoading from "../loading/RouteLoading";

type SearchParams = { from?: string | string[] };

async function LoginContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { from } = await searchParams;
  return <LoginRouteClient from={typeof from === "string" ? from : null} />;
}

export default function LoginRoute({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<RouteLoading label="Loading login page…" />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}
