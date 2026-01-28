export type User = {
    id: number;
    [key: string]: string | number;
};

export type State = {
    users: User[];
    addedColumns: string[]
};

export type Action =
    | { type: "EDIT_CELL"; payload: { id: number; column: string; value: string } }
    | { type: "ADD_ROW" }
    | { type: "ADD_COLUMN" };