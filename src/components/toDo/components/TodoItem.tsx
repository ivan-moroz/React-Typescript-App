import { Props } from '../types/types';

export function TodoItem({ todo, onToggle, onRemove }: Props) {
    return (
        <li className={`todo-item ${todo.completed ? 'completed' : ''}`}>
            <label>
                <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => onToggle(todo.id)}
                />
                <span>{todo.text}</span>
            </label>

            <button onClick={() => onRemove(todo.id)}>❌</button>
        </li>
    );
}
