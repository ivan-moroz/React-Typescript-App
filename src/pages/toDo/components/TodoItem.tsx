import { Props } from "../types/types";

export function TodoItem({
	todo,
	onToggle,
	onAction,
}: Props) {
	return (
		<li className={`todo-item ${todo.completed ? "completed" : ""}`}>
			<label>
				<input
					type="checkbox"
					checked={todo.completed}
					onChange={() => onToggle?.(todo.id)}
				/>
				<span>{todo.text}</span>
			</label>

			<button
				aria-label="Remove todo"
				onClick={() => onAction(todo.id)}
			>
				<span className="material-icons">delete</span>
			</button>
		</li>
	);
}
