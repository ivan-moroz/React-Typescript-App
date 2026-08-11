export type User = {
    id: number;
    [key: string]: string | number;
};

export type State = {
    users: User[];
};

export enum ActionType {
    SET_USERS = 'SET_USERS',
    APPEND_USERS = 'APPEND_USERS',
}

export type Action =
    | { type: ActionType.SET_USERS; payload: User[] }
    | { type: ActionType.APPEND_USERS; payload: User[] };

export type UserFormState = {
    name: string;
    email: string;
    age: string;
    city: string;
};
