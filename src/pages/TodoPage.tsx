import React, {lazy} from "react";

const ToDo = lazy(() => import('../components/toDo/ToDo'));

export default function ToDoPage() {
    return <ToDo />;
}