import LoginRouteClient from "./LoginRouteClient";

type SearchParams = { from?: string | string[] };

export default async function LoginRoute({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { from } = await searchParams;
  return <LoginRouteClient from={typeof from === "string" ? from : null} />;
}
