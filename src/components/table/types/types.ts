export type User = {
    id: number;
    [key: string]: string | number;
};

export type State = {
    users: User[];
    addedColumns: string[]
};

export enum ActionType {
    EDIT_CELL = 'EDIT_CELL',
    ADD_ROW = 'ADD_ROW',
    ADD_COLUMN = 'ADD_COLUMN',
    DELETE_ROW = 'DELETE_ROW',
    DELETE_COLUMN = 'DELETE_COLUMN'
}

export type Action =
    | { type: ActionType.EDIT_CELL; payload: { id: number; column: string; value: string } }
    | { type: ActionType.ADD_ROW }
    | { type: ActionType.ADD_COLUMN }
    | { type: ActionType.DELETE_ROW; payload: { id: number } }
    | { type: ActionType.DELETE_COLUMN; payload: { column: string } };
