import { ReactNode } from 'react';

export type Types = {
    id: number;
    text: string;
    completed: boolean;
};

export type Props = {
    todo: Types;
    onToggle?: (id: number) => void;
    onAction: (id: number) => void;
    actionLabel?: ReactNode;
    actionAriaLabel?: string;
    isDeleted?: boolean;
};

export type State = {
    todos: Types[];
    deletedTodos: Types[];
};

export enum ActionType {
    SET_INITIAL_TODO = 'SET_INITIAL_TODO',
    ADD_TODO = 'ADD_TODO',
    TOGGLE_TODO = 'TOGGLE_TODO',
    REMOVE_TODO = 'REMOVE_TODO',
    RESTORE_TODO = 'RESTORE_TODO'
}

export type Action =
    | { type: ActionType.SET_INITIAL_TODO; payload: Types }
    | { type: ActionType.ADD_TODO; payload: string }
    | { type: ActionType.TOGGLE_TODO; payload: number }
    | { type: ActionType.REMOVE_TODO; payload: number }
    | { type: ActionType.RESTORE_TODO; payload: number };
