import {State, Action, ActionType} from '../types/types';

export const initialState: State = {
    todos: [
        {
            id: Date.now(),
            text: 'Learn React + TypeScript',
            completed: false
        }
    ],
    deletedTodos: []
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
                ],
                deletedTodos: state.deletedTodos
            };

        case ActionType.TOGGLE_TODO:
            return {
                todos: state.todos.map(todo =>
                    todo.id === action.payload
                        ? { ...todo, completed: !todo.completed }
                        : todo
                ),
                deletedTodos: state.deletedTodos
            };

        case ActionType.REMOVE_TODO:
            const todoToDelete = state.todos.find(todo => todo.id === action.payload);

            return {
                todos: state.todos.filter(todo => todo.id !== action.payload),
                deletedTodos: todoToDelete
                    ? [todoToDelete, ...state.deletedTodos]
                    : state.deletedTodos
            };

        case ActionType.RESTORE_TODO:
            const todoToRestore = state.deletedTodos.find(todo => todo.id === action.payload);

            return {
                todos: todoToRestore ? [...state.todos, todoToRestore] : state.todos,
                deletedTodos: state.deletedTodos.filter(todo => todo.id !== action.payload)
            };

        default:
            return state;
    }
}
