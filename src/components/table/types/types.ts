export type User = {
    id: number;
    [key: string]: string | number;
};

export type State = {
    users: User[];
    addedColumns: string[]
};

export enum ActionType {
    SET_USERS = 'SET_USERS',
    EDIT_CELL = 'EDIT_CELL',
    ADD_USER = 'ADD_USER',
    ADD_COLUMN = 'ADD_COLUMN'
}

export type Action =
    | { type: ActionType.SET_USERS; payload: User[] }
    | { type: ActionType.EDIT_CELL; payload: { id: number; column: string; value: string } }
    | { type: ActionType.ADD_USER; payload: User }
    | { type: ActionType.ADD_COLUMN };
