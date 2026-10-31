import ServerNavigation from "../../features/navigation/ServerNavigation";
import { getAppNavigationProps } from "./server-props";

export default async function ServerNavigationSSR() {
  const navigation = await getAppNavigationProps();
  return <ServerNavigation {...navigation} liveUpdates />;
}
