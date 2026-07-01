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
        default:
            return state;
    }
};
