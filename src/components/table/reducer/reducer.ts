import {Action, State, User, ActionType} from "../types/types";

export const initialState: State = {
    users: Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        age: 20 + i,
        city: `City ${i + 1}`,
    })),
    addedColumns:[]
};

export const reducer = (state: State, action: Action): State => {
    switch (action.type) {
        case ActionType.EDIT_CELL:
            return {
                ...state,
                users: state.users.map((user) =>
                    user.id === action.payload.id
                        ? { ...user, [action.payload.column]: action.payload.value }
                        : user
                ),
            };
        case ActionType.ADD_ROW:
            const newRow: User = {
                id: state.users.length + 1,
                name: `User ${state.users.length + 1}`,
                email: "",
                age: "",
                city: ""
            };
            state.addedColumns.forEach((col) => {
                newRow[col] = ""
            })
            return { ...state, users: [...state.users, newRow] };
        case ActionType.ADD_COLUMN:
            const newColumnName = `column${Object.keys(state.users[0]).length}`;
            return {
                ...state,
                users: state.users.map((user) => ({ ...user, [newColumnName]: "" })),
                addedColumns: [...state.addedColumns, newColumnName]
            };
        case ActionType.DELETE_ROW:
            if (state.users.length === 1) {
                return state;
            }

            return {
                ...state,
                users: state.users.filter((user) => user.id !== action.payload.id),
            };
        case ActionType.DELETE_COLUMN:
            if (action.payload.column === 'id') {
                return state;
            }

            return {
                ...state,
                users: state.users.map((user) => {
                    const updatedUser = { ...user };
                    delete updatedUser[action.payload.column];
                    return updatedUser;
                }),
                addedColumns: state.addedColumns.filter((column) => column !== action.payload.column)
            };
        default:
            return state;
    }
};
