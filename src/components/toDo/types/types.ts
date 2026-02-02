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

export enum ActionType {
    ADD_TODO = 'ADD_TODO',
    TOGGLE_TODO = 'TOGGLE_TODO',
    REMOVE_TODO = 'REMOVE_TODO'
}

export type Action =
    | { type: ActionType.ADD_TODO; payload: string }
    | { type: ActionType.TOGGLE_TODO; payload: number }
    | { type: ActionType.REMOVE_TODO; payload: number };
