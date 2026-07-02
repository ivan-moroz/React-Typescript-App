import React, {useEffect, useReducer, useState} from "react";

import Modal from "../modal/Modal";
import {initialState, reducer} from "./reducer/reducer";
import {ActionType, User, UserFormState} from "./types/types";
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
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

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

    const resetUserForm = (): void => {
        setUserForm(emptyUserForm);
        setEditingUserId(null);
        setFormError("");
    };

    const handleStartCreateUser = (): void => {
        resetUserForm();
        setIsUserFormOpen(true);
    };

    const handleCloseUserForm = (): void => {
        setIsUserFormOpen(false);
        resetUserForm();
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

    const handleRequestDeleteUser = (user: User): void => {
        setUserToDelete(user);
    };

    const handleCloseDeleteModal = (): void => {
        setUserToDelete(null);
    };

    const handleDeleteUser = async (): Promise<void> => {
        if (!userToDelete) {
            return;
        }

        setError('');

        try {
            const response = await fetch(`/api/users/${userToDelete.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Unable to delete user');
            }

            await loadUsers();
            setUserToDelete(null);
        } catch {
            setError('Failed to delete user');
        }
    };

    return (
        <div>
            {isLoading && <p>Loading table data...</p>}
            {error && <p>{error}</p>}
            <div className='input-group'>
                <button data-testid='table-add-user' onClick={handleStartCreateUser}>
                    Add User
                </button>
            </div>
            {state.users.length === 0 ? (
                !isLoading && !error ? <p>No users found.</p> : null
            ) : (
            <table className="user-table" border={1} style={{ marginTop: "10px", borderCollapse: "collapse" }}>
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
                                <span>{value}</span>
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
                                onClick={() => handleRequestDeleteUser(user)}
                            >
                                <span className="material-icons">delete</span>
                            </button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
            )}
            <Modal
                isOpen={isUserFormOpen}
                title={isEditingUser ? 'Edit user' : 'Create user'}
                onClose={handleCloseUserForm}
                footer={(
                    <>
                        <button type='button' onClick={handleCloseUserForm}>
                            Cancel
                        </button>
                        <button type='submit' form='user-form' disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : isEditingUser ? 'Update User' : 'Save User'}
                        </button>
                    </>
                )}
            >
                <form id='user-form' className='add-user-form' onSubmit={(event) => void handleSubmitUser(event)}>
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
                    {formError && <p>{formError}</p>}
                </form>
            </Modal>
            <Modal
                isOpen={userToDelete !== null}
                title='Delete user'
                onClose={handleCloseDeleteModal}
                footer={(
                    <>
                        <button type='button' onClick={handleCloseDeleteModal}>
                            Cancel
                        </button>
                        <button type='button' onClick={() => void handleDeleteUser()}>
                            Delete
                        </button>
                    </>
                )}
            >
                <p>Are you sure to delete user {userToDelete?.name}</p>
            </Modal>
        </div>
    );
};

export default EditableTable;
