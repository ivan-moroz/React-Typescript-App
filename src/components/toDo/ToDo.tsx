import React, { useReducer, useState } from 'react';
import { todoReducer, initialState } from './reducer/todoReducer';
import { TodoItem } from './components/TodoItem';
import './styles/style.css';

export default function App() {
    const [state, dispatch] = useReducer(todoReducer, initialState);
    const [input, setInput] = useState('');

    const addTodo = (): void => {
        if (!input.trim()) return;
        dispatch({ type: 'ADD_TODO', payload: input });
        setInput('');
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
        e.preventDefault();
        addTodo();
    };

    return (
        <div className="app">
            <h1>ToDo List</h1>

            <form className="input-group" onSubmit={handleSubmit}>
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Add task"
                />
                <button type="submit">Add</button>
            </form>

            <ul className="todo-list">
                {state.todos.map(todo => (
                    <TodoItem
                        key={todo.id}
                        todo={todo}
                        onToggle={id =>
                            dispatch({ type: 'TOGGLE_TODO', payload: id })
                        }
                        onRemove={id =>
                            dispatch({ type: 'REMOVE_TODO', payload: id })
                        }
                    />
                ))}
            </ul>
        </div>
    );
}

