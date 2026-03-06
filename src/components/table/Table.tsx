import React, {useCallback, useEffect, useReducer, useState} from "react";

import {initialState, reducer} from "./reducer/reducer";
import {ActionType} from "./types/types";

type NewUserForm = {
    name: string;
    email: string;
    age: string;
    city: string;
};

const initialFormState: NewUserForm = {
    name: '',
    email: '',
    age: '',
    city: '',
};

function EditableTable() {
    const [state, dispatch] = useReducer(reducer, initialState);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isAddUserFormOpen, setIsAddUserFormOpen] = useState<boolean>(false);
    const [newUserForm, setNewUserForm] = useState<NewUserForm>(initialFormState);

    const loadUsers = useCallback(async (): Promise<void> => {
        setError('');
        try {
            const response = await fetch('http://localhost:3001/api/users');
            if (!response.ok) {
                throw new Error('Unable to fetch users');
            }

            const users = await response.json();
            dispatch({ type: ActionType.SET_USERS, payload: users });
        } catch {
            setError('Failed to load users from backend');
        }
    }, []);

    useEffect(() => {
        const loadInitialUsers = async (): Promise<void> => {
            await loadUsers();
            setIsLoading(false);
        };

        void loadInitialUsers();
    }, [loadUsers]);

    const handleEdit = (id: number, column: string, value: string):void => {
        dispatch({ type: ActionType.EDIT_CELL, payload: { id, column, value } });
    };

    const handleAddRow = ():void => {
        dispatch({ type: ActionType.ADD_ROW });
    };

    const handleAddColumn = ():void => {
        dispatch({ type: ActionType.ADD_COLUMN });
    };

    const handleFormValueChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const { name, value } = event.target;
        setNewUserForm((prevState) => ({ ...prevState, [name]: value }));
    };

    const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            const response = await fetch('http://localhost:3001/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: newUserForm.name,
                    email: newUserForm.email,
                    age: Number(newUserForm.age),
                    city: newUserForm.city,
                }),
            });

            if (!response.ok) {
                throw new Error('Unable to add user');
            }

            setNewUserForm(initialFormState);
            setIsAddUserFormOpen(false);
            await loadUsers();
        } catch {
            setError('Failed to add user');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div>
            {isLoading && <p>Loading table data...</p>}
            {error && <p>{error}</p>}
            <div className='input-group'>
                <button data-testid='table-add-user' onClick={() => setIsAddUserFormOpen(true)}>Add User</button>
                <button data-testid='table-add-row' onClick={handleAddRow}>Add Row</button>
                <button data-testid='table-add-column' onClick={handleAddColumn}>Add Column</button>
            </div>

            {isAddUserFormOpen && (
                <form onSubmit={(event) => void handleCreateUser(event)} style={{ marginTop: '10px' }}>
                    <input name='name' placeholder='Name' value={newUserForm.name} onChange={handleFormValueChange} required />
                    <input name='email' placeholder='Email' type='email' value={newUserForm.email} onChange={handleFormValueChange} required />
                    <input name='age' placeholder='Age' type='number' value={newUserForm.age} onChange={handleFormValueChange} required min={0} />
                    <input name='city' placeholder='City' value={newUserForm.city} onChange={handleFormValueChange} required />
                    <button type='submit' disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Save User'}</button>
                </form>
            )}

            {state.users.length === 0 ? (
                !isLoading && !error ? <p>No users found.</p> : null
            ) : (
            <table border={1} style={{ marginTop: "10px", borderCollapse: "collapse" }}>
                <thead>
                <tr>
                    {Object.keys(state.users[0]).map((key) => (
                        <th key={key}>{key}</th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {state.users.map((user) => (
                    <tr key={user.id}>
                        {Object.entries(user).map(([key, value]) => (
                            <td key={key}>
                                {key === 'id' ? (
                                    <span>{value}</span>
                                ) : (
                                    <input
                                        type="text"
                                        value={value}
                                        onChange={(e) =>
                                            handleEdit(user.id, key, e.target.value)
                                        }
                                    />
                                )}
                            </td>
                        ))}
                    </tr>
                ))}
                </tbody>
            </table>
            )}
        </div>
    );
};

export default EditableTable;
