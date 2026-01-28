export type Todo = {
    id: number;
    text: string;
    completed: boolean;
};

export type State = {
    todos: Todo[];
};

export type Action =
    | { type: 'ADD_TODO'; payload: string }
    | { type: 'TOGGLE_TODO'; payload: number }
    | { type: 'REMOVE_TODO'; payload: number };
