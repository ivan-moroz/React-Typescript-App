export type Types = {
    id: number;
    text: string;
    completed: boolean;
};

export type Props = {
    todo: Types;
    onToggle: (id: number) => void;
    onRemove: (id: number) => void;
};

export type State = {
    todos: Types[];
};

export type Action =
    | { type: 'ADD_TODO'; payload: string }
    | { type: 'TOGGLE_TODO'; payload: number }
    | { type: 'REMOVE_TODO'; payload: number };
