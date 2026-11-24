export type BinaryOperation = "+" | "-" | "*" | "/" | "%" | "^";
export type UnaryOperation = "sqrt" | "sin" | "cos" | "tan" | "log";
export type AngleMode = "DEG" | "RAD";

export interface State {
	display: string;
	firstOperand: number | null;
	operation: BinaryOperation | null;
	angleMode: AngleMode;
	startsNewEntry: boolean;
}

export enum ActionType {
	ADD_NUMBER = "ADD_NUMBER",
	SET_OPERATION = "SET_OPERATION",
	APPLY_UNARY = "APPLY_UNARY",
	TOGGLE_SIGN = "TOGGLE_SIGN",
	BACKSPACE = "BACKSPACE",
	TOGGLE_ANGLE_MODE = "TOGGLE_ANGLE_MODE",
	CALCULATE = "CALCULATE",
	CLEAR = "CLEAR",
}

export type Action =
	| { type: ActionType.ADD_NUMBER; payload: string }
	| { type: ActionType.SET_OPERATION; payload: BinaryOperation }
	| { type: ActionType.APPLY_UNARY; payload: UnaryOperation }
	| { type: ActionType.TOGGLE_SIGN }
	| { type: ActionType.BACKSPACE }
	| { type: ActionType.TOGGLE_ANGLE_MODE }
	| { type: ActionType.CALCULATE }
	| { type: ActionType.CLEAR };
