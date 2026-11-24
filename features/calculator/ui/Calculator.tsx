"use client";

import { useReducer } from "react";
import { initialState, reducer } from "../model/reducer";
import { ActionType, BinaryOperation, UnaryOperation } from "../model/types";

const numbers = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "0"];
const operations: { label: string; operation: BinaryOperation }[] = [
	{ label: "+", operation: "+" },
	{ label: "−", operation: "-" },
	{ label: "×", operation: "*" },
	{ label: "÷", operation: "/" },
	{ label: "%", operation: "%" },
	{ label: "xʸ", operation: "^" },
];
const unaryOperations: { label: string; operation: UnaryOperation }[] = [
	{ label: "√x", operation: "sqrt" },
	{ label: "sin", operation: "sin" },
	{ label: "cos", operation: "cos" },
	{ label: "tan", operation: "tan" },
	{ label: "log", operation: "log" },
];

export default function Calculator() {
	const [state, dispatch] = useReducer(reducer, initialState);

	return (
		<section className="calculator" aria-label="Calculator">
			<output className="display" aria-live="polite" aria-label="Display">
				{state.display || "0"}
			</output>
			<div className="calculator-toolbar">
				<button
					type="button"
					className="angle-mode"
					aria-label={`Angle mode: ${state.angleMode === "DEG" ? "degrees" : "radians"}; switch mode`}
					title="Switch between degrees and radians"
					onClick={() => dispatch({ type: ActionType.TOGGLE_ANGLE_MODE })}
				>
					{state.angleMode}
				</button>
				<button
					type="button"
					aria-label="Delete last digit"
					title="Delete last digit"
					onClick={() => dispatch({ type: ActionType.BACKSPACE })}
				>
					<span className="material-icons" aria-hidden="true">
						backspace
					</span>
				</button>
				<button
					type="button"
					aria-label="Change sign"
					title="Change sign"
					onClick={() => dispatch({ type: ActionType.TOGGLE_SIGN })}
				>
					±
				</button>
				<button
					type="button"
					className="clear"
					aria-label="Clear calculator"
					onClick={() => dispatch({ type: ActionType.CLEAR })}
				>
					C
				</button>
			</div>
			<div className="scientific-buttons" aria-label="Scientific functions">
				{unaryOperations.map(({ label, operation }) => (
					<button
						type="button"
						key={operation}
						aria-label={
							operation === "sqrt"
								? "Square root"
								: operation === "log"
									? "Base-10 logarithm"
									: operation
						}
						title={operation === "log" ? "Base-10 logarithm" : undefined}
						onClick={() =>
							dispatch({ type: ActionType.APPLY_UNARY, payload: operation })
						}
					>
						{label}
					</button>
				))}
			</div>
			<div className="keypad">
				<div className="numbers">
					{numbers.map((number) => (
						<button
							type="button"
							key={number}
							onClick={() =>
								dispatch({ type: ActionType.ADD_NUMBER, payload: number })
							}
						>
							{number}
						</button>
					))}
					<button
						type="button"
						className="decimal"
						aria-label="Decimal point"
						onClick={() => dispatch({ type: ActionType.ADD_NUMBER, payload: "." })}
					>
						.
					</button>
				</div>
				<div className="operations">
					{operations.map(({ label, operation }) => (
						<button
							type="button"
							key={operation}
							aria-label={operation === "^" ? "Power" : `Operation ${label}`}
							onClick={() =>
								dispatch({ type: ActionType.SET_OPERATION, payload: operation })
							}
						>
							{label}
						</button>
					))}
					<button
						type="button"
						className="calculate"
						aria-label="Calculate"
						onClick={() => dispatch({ type: ActionType.CALCULATE })}
					>
						=
					</button>
				</div>
			</div>
		</section>
	);
}
