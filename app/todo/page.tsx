import { Suspense } from "react";
import TodoPage from "../../features/todo/ui/TodoPage";
import RouteLoading from "../loading/RouteLoading";
import "../../features/todo/styles/todo.scss";

export default function TodoRoute() {
  return (
    <Suspense fallback={<RouteLoading label="Loading tasks…" />}>
      <TodoPage />
    </Suspense>
  );
}
