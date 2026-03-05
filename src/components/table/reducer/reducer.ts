import {Action, State, User, ActionType} from "../types/types";

export const initialState: State = {
    users: [],
    addedColumns:[]
};

export const reducer = (state: State, action: Action): State => {
    switch (action.type) {
        case ActionType.SET_USERS:
            return {
                ...state,
                users: action.payload,
            };
        case ActionType.EDIT_CELL:
            if (action.payload.column === 'id') {
                return state;
            }
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
            if (state.users.length === 0) {
                return state;
            }
            const newColumnName = `column${Object.keys(state.users[0]).length}`;
            return {
                ...state,
                users: state.users.map((user) => ({ ...user, [newColumnName]: "" })),
                addedColumns: [...state.addedColumns, newColumnName]
            };
        default:
            return state;
    }
};
