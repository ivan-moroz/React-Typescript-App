import {State, Action, ActionType} from '../types/types';

export const initialState: State = {
    todos: [
        {
            id: Date.now(),
            text: 'Learn React + TypeScript',
            completed: false
        }
    ]
};

export function reducer(state: State, action: Action): State {
    switch (action.type) {
        case ActionType.ADD_TODO:
            return {
                todos: [
                    ...state.todos,
                    {
                        id: Date.now(),
                        text: action.payload,
                        completed: false
                    }
                ]
            };

        case ActionType.TOGGLE_TODO:
            return {
                todos: state.todos.map(todo =>
                    todo.id === action.payload
                        ? { ...todo, completed: !todo.completed }
                        : todo
                )
            };

        case ActionType.REMOVE_TODO:
            return {
                todos: state.todos.filter(todo => todo.id !== action.payload)
            };

        default:
            return state;
    }
}
