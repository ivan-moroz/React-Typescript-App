import { Props } from '../types/types';

export function TodoItem({
    todo,
    onToggle,
    onAction,
    actionLabel = '❌',
    isDeleted = false
}: Props) {
    return (
        <li className={`todo-item ${todo.completed ? 'completed' : ''} ${isDeleted ? 'deleted' : ''}`}>
            {isDeleted ? (
                <span>{todo.text}</span>
            ) : (
                <label>
                    <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => onToggle?.(todo.id)}
                    />
                    <span>{todo.text}</span>
                </label>
            )}

            <button onClick={() => onAction(todo.id)}>{actionLabel}</button>
        </li>
    );
}
