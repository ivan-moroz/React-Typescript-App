import { Suspense } from "react";
import CalculatorPage from "../../features/calculator/ui/CalculatorPage";
import RouteLoading from "../loading/RouteLoading";
import "../../features/calculator/styles/calculator.scss";

export default function CalculatorRoute() {
  return (
    <Suspense fallback={<RouteLoading label="Loading calculator…" />}>
      <CalculatorPage />
    </Suspense>
  );
}
