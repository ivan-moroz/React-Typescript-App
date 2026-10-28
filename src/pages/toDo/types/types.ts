export type Types = {
	id: number;
	text: string;
	completed: boolean;
};

export type Props = {
	todo: Types;
	onToggle?: (id: number) => void;
	onAction: (id: number) => void;
};

export type State = {
	todos: Types[];
};

export enum ActionType {
	SET_INITIAL_TODOS = "SET_INITIAL_TODOS",
	ADD_TODO = "ADD_TODO",
	TOGGLE_TODO = "TOGGLE_TODO",
	REMOVE_TODO = "REMOVE_TODO",
}

export type Action =
	| { type: ActionType.SET_INITIAL_TODOS; payload: Types[] }
	| { type: ActionType.ADD_TODO; payload: Types }
	| { type: ActionType.TOGGLE_TODO; payload: number }
	| { type: ActionType.REMOVE_TODO; payload: number };
