import React, {useEffect, useReducer, useState} from "react";

import {initialState, reducer} from "./reducer/reducer";
import {ActionType, UserFormState} from "./types/types";
import './styles/styles.scss';

const emptyUserForm: UserFormState = {
    name: "",
    email: "",
    age: "",
    city: ""
};

function EditableTable() {
    const [state, dispatch] = useReducer(reducer, initialState);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");
    const [isUserFormOpen, setIsUserFormOpen] = useState<boolean>(false);
    const [editingUserId, setEditingUserId] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [formError, setFormError] = useState<string>("");
    const [userForm, setUserForm] = useState<UserFormState>(emptyUserForm);

    const isEditingUser = editingUserId !== null;

    const loadUsers = async (): Promise<void> => {
        setError("");
        try {
            const response = await fetch('/api/users');
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

    const resetUserForm = (): void => {
        setUserForm(emptyUserForm);
        setEditingUserId(null);
        setFormError("");
    };

    const handleToggleCreateUserForm = (): void => {
        if (isUserFormOpen && !isEditingUser) {
            setIsUserFormOpen(false);
            resetUserForm();
            return;
        }

        resetUserForm();
        setIsUserFormOpen(true);
    };

    const handleStartEditUser = (userId: number): void => {
        const user = state.users.find((currentUser) => currentUser.id === userId);

        if (!user) {
            return;
        }

        setUserForm({
            name: String(user.name),
            email: String(user.email),
            age: String(user.age),
            city: String(user.city)
        });
        setEditingUserId(userId);
        setFormError("");
        setIsUserFormOpen(true);
    };

    const handleInputChange = (field: keyof UserFormState, value: string): void => {
        setUserForm((prevState) => ({...prevState, [field]: value}));
    };

    const handleSubmitUser = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        setFormError("");

        if (!userForm.name.trim() || !userForm.email.trim() || !userForm.age.trim() || !userForm.city.trim()) {
            setFormError('All fields are required');
            return;
        }

        const parsedAge = Number(userForm.age);
        if (!Number.isInteger(parsedAge) || parsedAge <= 0) {
            setFormError('Age must be a positive number');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(isEditingUser ? `/api/users/${editingUserId}` : '/api/users', {
                method: isEditingUser ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: userForm.name.trim(),
                    email: userForm.email.trim(),
                    age: parsedAge,
                    city: userForm.city.trim()
                })
            });

            if (!response.ok) {
                throw new Error(isEditingUser ? 'Unable to update user' : 'Unable to create user');
            }

            await loadUsers();
            setIsUserFormOpen(false);
            resetUserForm();
        } catch {
            setFormError(isEditingUser ? 'Failed to update user' : 'Failed to add user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = async (id: number): Promise<void> => {
        setError('');

        try {
            const response = await fetch(`/api/users/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Unable to delete user');
            }

            await loadUsers();
        } catch {
            setError('Failed to delete user');
        }
    };

    return (
        <div>
            {isLoading && <p>Loading table data...</p>}
            {error && <p>{error}</p>}
            <div className='input-group'>
                <button data-testid='table-add-user' onClick={handleToggleCreateUserForm}>
                    {isUserFormOpen && !isEditingUser ? 'Close Form' : 'Add User'}
                </button>
            </div>
            {isUserFormOpen && (
                <form className='add-user-form' onSubmit={(event) => void handleSubmitUser(event)} style={{marginTop: '10px'}}>
                    <input
                        type='text'
                        placeholder='Name'
                        value={userForm.name}
                        onChange={(event) => handleInputChange('name', event.target.value)}
                    />
                    <input
                        type='email'
                        placeholder='Email'
                        value={userForm.email}
                        onChange={(event) => handleInputChange('email', event.target.value)}
                    />
                    <input
                        type='number'
                        placeholder='Age'
                        value={userForm.age}
                        onChange={(event) => handleInputChange('age', event.target.value)}
                    />
                    <input
                        type='text'
                        placeholder='City'
                        value={userForm.city}
                        onChange={(event) => handleInputChange('city', event.target.value)}
                    />
                    <div className='input-group'>
                        <button type='submit' disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : isEditingUser ? 'Update User' : 'Save User'}
                        </button>
                        {isEditingUser && (
                            <button
                                type='button'
                                onClick={() => {
                                    setIsUserFormOpen(false);
                                    resetUserForm();
                                }}
                            >
                                Cancel
                            </button>
                        )}
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
                    <th>actions</th>
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
                        <td>
                            <button
                                type='button'
                                aria-label={`Edit user ${user.name}`}
                                onClick={() => handleStartEditUser(user.id)}
                            >
                                <span className="material-icons">edit</span>
                            </button>
                            <button
                                type='button'
                                aria-label={`Delete user ${user.name}`}
                                onClick={() => void handleDeleteUser(user.id)}
                            >
                                <span className="material-icons">delete</span>
                            </button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
            )}
        </div>
    );
};

export default EditableTable;
