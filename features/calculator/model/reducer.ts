import { Action, ActionType, State, UnaryOperation } from "./types";

export const initialState: State = {
	display: "0",
	firstOperand: null,
	operation: null,
	angleMode: "DEG",
	startsNewEntry: true,
};

function formatResult(value: number): string {
	if (!Number.isFinite(value)) return "Error";
	if (Math.abs(value) < 1e-12) return "0";
	return Number.parseFloat(value.toPrecision(12)).toString();
}

function binaryResult(
	firstOperand: number,
	secondOperand: number,
	operation: NonNullable<State["operation"]>,
): number {
	switch (operation) {
		case "+":
			return firstOperand + secondOperand;
		case "-":
			return firstOperand - secondOperand;
		case "*":
			return firstOperand * secondOperand;
		case "/":
			return secondOperand === 0 ? Number.NaN : firstOperand / secondOperand;
		case "%":
			return (firstOperand * secondOperand) / 100;
		case "^":
			return firstOperand ** secondOperand;
	}
}

function applyUnary(
	value: number,
	operation: UnaryOperation,
	angleMode: State["angleMode"],
): number {
	const angle = angleMode === "DEG" ? (value * Math.PI) / 180 : value;
	switch (operation) {
		case "sqrt":
			return value < 0 ? Number.NaN : Math.sqrt(value);
		case "sin":
			return Math.sin(angle);
		case "cos":
			return Math.cos(angle);
		case "tan":
			return Math.abs(Math.cos(angle)) < 1e-12 ? Number.NaN : Math.tan(angle);
		case "log":
			return value <= 0 ? Number.NaN : Math.log10(value);
		default:
			return Number.NaN;
	}
}

export const reducer = (state: State, action: Action): State => {
	switch (action.type) {
		case ActionType.ADD_NUMBER: {
			const isError = state.display === "Error";
			const current = isError ? "0" : state.display;
			if (
				action.payload === "." &&
				!state.startsNewEntry &&
				current.includes(".")
			) {
				return state;
			}

			let display: string;
			if (state.startsNewEntry || isError) {
				display = action.payload === "." ? "0." : action.payload;
			} else if (current === "0") {
				display = action.payload === "." ? "0." : action.payload;
			} else if (current === "-0") {
				display = action.payload === "." ? "-0." : `-${action.payload}`;
			} else {
				display = current + action.payload;
			}
			return { ...state, display, startsNewEntry: false };
		}
		case ActionType.SET_OPERATION: {
			if (state.display === "Error") return state;
			if (state.display === "" && state.firstOperand !== null) {
				return { ...state, operation: action.payload };
			}
			if (state.firstOperand !== null && state.operation && state.display !== "") {
				const intermediate = binaryResult(
					state.firstOperand,
					Number(state.display),
					state.operation,
				);
				const display = formatResult(intermediate);
				return {
					...state,
					display,
					firstOperand: display === "Error" ? null : intermediate,
					operation: display === "Error" ? null : action.payload,
					startsNewEntry: true,
				};
			}
			const value = Number(state.display);
			if (!Number.isFinite(value)) return state;
			return {
				...state,
				firstOperand: value,
				operation: action.payload,
				display: "",
				startsNewEntry: true,
			};
		}
		case ActionType.APPLY_UNARY: {
			if (state.display === "" || state.display === "Error") return state;
			const result = applyUnary(Number(state.display), action.payload, state.angleMode);
			const display = formatResult(result);
			return {
				...state,
				display,
				firstOperand: display === "Error" ? null : state.firstOperand,
				operation: display === "Error" ? null : state.operation,
				startsNewEntry: true,
			};
		}
		case ActionType.TOGGLE_SIGN: {
			const current =
				state.display === "" || state.display === "Error" ? "0" : state.display;
			const display = current.startsWith("-") ? current.slice(1) : `-${current}`;
			return {
				...state,
				display,
				firstOperand: state.display === "Error" ? null : state.firstOperand,
				operation: state.display === "Error" ? null : state.operation,
				startsNewEntry: false,
			};
		}
		case ActionType.BACKSPACE: {
			if (state.display === "Error") {
				return { ...state, display: "0", startsNewEntry: true };
			}
			const display = state.display.slice(0, -1);
			return {
				...state,
				display: display === "" || display === "-" ? "0" : display,
				startsNewEntry: display === "" || display === "-",
			};
		}
		case ActionType.TOGGLE_ANGLE_MODE:
			return { ...state, angleMode: state.angleMode === "DEG" ? "RAD" : "DEG" };
		case ActionType.CALCULATE: {
			if (
				state.firstOperand === null ||
				!state.operation ||
				state.display === "" ||
				state.display === "Error"
			) {
				return state;
			}
			const display = formatResult(
				binaryResult(state.firstOperand, Number(state.display), state.operation),
			);
			return {
				...state,
				display,
				firstOperand: null,
				operation: null,
				startsNewEntry: true,
			};
		}
		case ActionType.CLEAR:
			return { ...initialState, angleMode: state.angleMode };
		default:
			return state;
	}
};
