import { Suspense } from "react";
import PuzzlePage from "../../features/puzzle/ui/PuzzlePage";
import RouteLoading from "../loading/RouteLoading";
import "../../features/puzzle/styles/puzzle.scss";

export default function PuzzleRoute() {
  return (
    <Suspense fallback={<RouteLoading label="Loading puzzle…" />}>
      <PuzzlePage />
    </Suspense>
  );
}
