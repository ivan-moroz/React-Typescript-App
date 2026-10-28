import { fetchData } from "../../utils/fetchData";
import React, { useEffect, useReducer, useState } from "react";
import { reducer, initialState } from "./reducer/reducer";
import { TodoItem } from "./components/TodoItem";
import "./styles/styles.scss";
import { ActionType, Types } from "./types/types";

export default function ToDo() {
	const [state, dispatch] = useReducer(reducer, initialState);
	const [input, setInput] = useState("");
	const [error, setError] = useState("");
	const [isAuthenticated, setIsAuthenticated] = useState(false);

	useEffect(() => {
		const loadInitialTodo = async (): Promise<void> => {
			const result = await fetchData<Types[]>("/api/todo");
			if (!result.success) {
				setError(result.error.message);
				return;
			}

			setIsAuthenticated(true);
			dispatch({
				type: ActionType.SET_INITIAL_TODOS,
				payload: result.data,
			});
		};

		loadInitialTodo();
	}, []);

	const addTodo = async (): Promise<void> => {
		if (!input.trim()) return;
		const result = await fetchData<Types>("/api/todo", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ text: input }),
		});
		if (!result.success) {
			setError(result.error.message);
			return;
		}
		dispatch({ type: ActionType.ADD_TODO, payload: result.data });
		setInput("");
		setError("");
	};

	const removeTodo = async (id: number): Promise<void> => {
		const result = await fetchData(`/api/todo?id=${id}`, {
			method: "DELETE",
			responseType: "void",
		});
		if (!result.success) {
			setError(result.error.message);
			return;
		}
		dispatch({ type: ActionType.REMOVE_TODO, payload: id });
		setError("");
	};

	const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>): void => {
		e.preventDefault();
		void addTodo();
	};

	return (
		<>
			{isAuthenticated && (
				<form className="input-group" onSubmit={handleSubmit}>
					<input
						data-testid="todo-input"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder="Add task"
					/>
					<button data-testid="todo-add-button" type="submit">
						Add
					</button>
				</form>
			)}
			{error && <p role="alert">{error}</p>}

			<ul className="todo-list">
				{state.todos.map((todo) => (
					<TodoItem
						key={todo.id}
						todo={todo}
						onToggle={(id) =>
							dispatch({
								type: ActionType.TOGGLE_TODO,
								payload: id,
							})
						}
						onAction={(id) => void removeTodo(id)}
					/>
				))}
			</ul>
		</>
	);
}
