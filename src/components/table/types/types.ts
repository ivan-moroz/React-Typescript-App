export type User = {
    id: number;
    [key: string]: string | number;
};

export type State = {
    users: User[];
};

export enum ActionType {
    SET_USERS = 'SET_USERS',
    EDIT_CELL = 'EDIT_CELL',
}

export type Action =
    | { type: ActionType.SET_USERS; payload: User[] }
    | { type: ActionType.EDIT_CELL; payload: { id: number; column: string; value: string } };
