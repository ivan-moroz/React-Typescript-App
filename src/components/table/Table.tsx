import React, {useEffect, useReducer, useState} from "react";

import {initialState, reducer} from "./reducer/reducer";
import {ActionType} from "./types/types";
import './styles/styles.scss';

function EditableTable() {
    const [state, dispatch] = useReducer(reducer, initialState);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");
    const [isAddUserFormOpen, setIsAddUserFormOpen] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [formError, setFormError] = useState<string>("");
    const [newUser, setNewUser] = useState({
        name: "",
        email: "",
        age: "",
        city: ""
    });

    const loadUsers = async (): Promise<void> => {
        setError("");
        try {
            const response = await fetch('http://localhost:3001/api/users');
            if (!response.ok) {
                throw new Error('Unable to fetch users');
            }

            const users = await response.json();
            dispatch({type: ActionType.SET_USERS, payload: users});
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

    const handleInputChange = (field: 'name' | 'email' | 'age' | 'city', value: string): void => {
        setNewUser((prevState) => ({...prevState, [field]: value}));
    };

    const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        setFormError("");

        if (!newUser.name.trim() || !newUser.email.trim() || !newUser.age.trim() || !newUser.city.trim()) {
            setFormError('All fields are required');
            return;
        }

        const parsedAge = Number(newUser.age);
        if (!Number.isInteger(parsedAge) || parsedAge <= 0) {
            setFormError('Age must be a positive number');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('http://localhost:3001/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: newUser.name.trim(),
                    email: newUser.email.trim(),
                    age: parsedAge,
                    city: newUser.city.trim()
                })
            });

            if (!response.ok) {
                throw new Error('Unable to create user');
            }

            await loadUsers();
            setIsAddUserFormOpen(false);
            setNewUser({name: '', email: '', age: '', city: ''});
        } catch {
            setFormError('Failed to add user');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div>
            {isLoading && <p>Loading table data...</p>}
            {error && <p>{error}</p>}
            <div className='input-group'>
                <button data-testid='table-add-user' onClick={() => setIsAddUserFormOpen((prevState) => !prevState)}>
                    {isAddUserFormOpen ? 'Close Form' : 'Add User'}
                </button>
            </div>
            {isAddUserFormOpen && (
                <form className='add-user-form' onSubmit={(event) => void handleCreateUser(event)} style={{marginTop: '10px'}}>
                    <input
                        type='text'
                        placeholder='Name'
                        value={newUser.name}
                        onChange={(event) => handleInputChange('name', event.target.value)}
                    />
                    <input
                        type='email'
                        placeholder='Email'
                        value={newUser.email}
                        onChange={(event) => handleInputChange('email', event.target.value)}
                    />
                    <input
                        type='number'
                        placeholder='Age'
                        value={newUser.age}
                        onChange={(event) => handleInputChange('age', event.target.value)}
                    />
                    <input
                        type='text'
                        placeholder='City'
                        value={newUser.city}
                        onChange={(event) => handleInputChange('city', event.target.value)}
                    />
                    <div className='input-group'>
                        <button type='submit' disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save User'}
                        </button>
                    </div>
                    {formError && <p>{formError}</p>}
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
