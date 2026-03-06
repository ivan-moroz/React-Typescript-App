import {Action, State, ActionType} from "../types/types";

export const initialState: State = {
    users: [],
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
        default:
            return state;
    }
};
