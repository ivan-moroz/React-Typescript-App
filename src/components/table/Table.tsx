import React, {useEffect, useReducer, useState} from "react";

import {initialState, reducer} from "./reducer/reducer";
import {ActionType} from "./types/types";

function EditableTable() {
    const [state, dispatch] = useReducer(reducer, initialState);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");
    const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
    const [formData, setFormData] = useState({ name: '', email: '', age: '', city: '' });
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const loadUsers = async (): Promise<void> => {
        try {
            const response = await fetch('http://localhost:3001/api/users');
            if (!response.ok) {
                throw new Error('Unable to fetch users');
            }

            const users = await response.json();
            dispatch({ type: ActionType.SET_USERS, payload: users });
            setError('');
        } catch {
            setError('Failed to load users from backend');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadUsers();
    }, []);

    const handleEdit = (id: number, column: string, value: string):void => {
        dispatch({ type: ActionType.EDIT_CELL, payload: { id, column, value } });
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const { name, value } = event.target;
        setFormData((previousState) => ({
            ...previousState,
            [name]: value,
        }));
    };

    const resetForm = ():void => {
        setFormData({ name: '', email: '', age: '', city: '' });
    };

    const handleAddUser = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();

        const parsedAge = Number(formData.age);

        if (!Number.isInteger(parsedAge) || parsedAge <= 0) {
            setError('Age must be a positive whole number');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('http://localhost:3001/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    age: parsedAge,
                    city: formData.city,
                }),
            });

            if (!response.ok) {
                throw new Error('Unable to create user');
            }

            setIsFormOpen(false);
            resetForm();
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
                <button data-testid='table-add-user' onClick={() => setIsFormOpen((prev) => !prev)}>
                    {isFormOpen ? 'Cancel' : 'Add User'}
                </button>
            </div>
            {isFormOpen && (
                <form onSubmit={(event) => void handleAddUser(event)}>
                    <input name='name' placeholder='Name' value={formData.name} onChange={handleInputChange} required />
                    <input name='email' placeholder='Email' value={formData.email} onChange={handleInputChange} required />
                    <input name='age' placeholder='Age' value={formData.age} onChange={handleInputChange} required />
                    <input name='city' placeholder='City' value={formData.city} onChange={handleInputChange} required />
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
