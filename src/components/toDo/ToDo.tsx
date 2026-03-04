import React, { useReducer, useState } from 'react';
import { reducer, initialState } from './reducer/reducer';
import { TodoItem } from './components/TodoItem';
import './styles/styles.scss';
import { ActionType } from './types/types';

export default function ToDo() {
    const [state, dispatch] = useReducer(reducer, initialState);
    const [input, setInput] = useState('');

    const addTodo = (): void => {
        if (!input.trim()) return;
        dispatch({ type: ActionType.ADD_TODO, payload: input });
        setInput('');
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
        e.preventDefault();
        addTodo();
    };

    return (
        <>
            <form className="input-group" onSubmit={handleSubmit}>
                <input
                    data-testid='todo-input'
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Add task"
                />
                <button data-testid='todo-add-button' type="submit">Add</button>
            </form>

            <ul className="todo-list">
                {state.todos.map(todo => (
                    <TodoItem
                        key={todo.id}
                        todo={todo}
                        onToggle={id =>
                            dispatch({ type: ActionType.TOGGLE_TODO, payload: id })
                        }
                        onAction={id =>
                            dispatch({ type: ActionType.REMOVE_TODO, payload: id })
                        }
                    />
                ))}
            </ul>

            <section className="deleted-items" data-testid="deleted-items-section">
                <h2>Deleted</h2>
                {state.deletedTodos.length === 0 ? (
                    <p className="empty-state">Nothing found</p>
                ) : (
                    <ul className="todo-list">
                        {state.deletedTodos.map(todo => (
                            <TodoItem
                                key={todo.id}
                                todo={todo}
                                isDeleted
                                actionLabel={<span className="material-icons">restore_from_trash</span>}
                                actionAriaLabel="Restore todo"
                                onAction={id =>
                                    dispatch({
                                        type: ActionType.RESTORE_TODO,
                                        payload: id
                                    })
                                }
                            />
                        ))}
                    </ul>
                )}
            </section>
        </>
    );
}
