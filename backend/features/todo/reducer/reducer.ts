import { State, Action, ActionType } from "../types/types";

export const initialState: State = {
	todos: [],
};

export function reducer(state: State, action: Action): State {
	switch (action.type) {
		case ActionType.SET_INITIAL_TODOS:
			return {
				todos: state.todos.length ? state.todos : action.payload,
			};

		case ActionType.ADD_TODO:
			return {
				todos: [...state.todos, action.payload],
			};

		case ActionType.TOGGLE_TODO:
			return {
				todos: state.todos.map((todo) =>
					todo.id === action.payload
						? { ...todo, completed: !todo.completed }
						: todo,
				),
			};

		case ActionType.REMOVE_TODO:
			return {
				todos: state.todos.filter((todo) => todo.id !== action.payload),
			};

		default:
			return state;
	}
}
