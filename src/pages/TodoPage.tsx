import React, {lazy} from "react";

const ToDo = lazy(() => import('../components/toDo/ToDo'));

export default function ToDoPage() {
    return (
        <div className="app">
            <ToDo />
        </div>
    )
}