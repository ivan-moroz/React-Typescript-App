import React, {useEffect, useReducer, useState} from "react";

import {initialState, reducer} from "./reducer/reducer";
import {ActionType} from "./types/types";

function EditableTable() {
    const [state, dispatch] = useReducer(reducer, initialState);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");

    useEffect(() => {
        const loadUsers = async (): Promise<void> => {
            try {
                const response = await fetch('http://localhost:3001/api/users');
                if (!response.ok) {
                    throw new Error('Unable to fetch users');
                }

                const users = await response.json();
                dispatch({ type: ActionType.SET_USERS, payload: users });
            } catch {
                setError('Failed to load users from backend');
            } finally {
                setIsLoading(false);
            }
        };

        void loadUsers();
    }, []);

    const handleEdit = (id: number, column: string, value: string):void => {
        dispatch({ type: ActionType.EDIT_CELL, payload: { id, column, value } });
    };

    const handleAddRow = async (): Promise<void> => {
        setError('');
        const nextId = state.users.length === 0 ? 1 : Math.max(...state.users.map((user) => user.id)) + 1;
        const userPayload = {
            name: `User ${nextId}`,
            email: `user${nextId}@example.com`,
            age: 20,
            city: 'Unknown',
        };

        try {
            const response = await fetch('http://localhost:3001/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userPayload),
            });

            if (!response.ok) {
                throw new Error('Unable to add user');
            }

            const createdUser = await response.json();
            dispatch({ type: ActionType.ADD_USER, payload: createdUser });
        } catch {
            setError('Failed to add user to backend');
        }
    };

    const handleAddColumn = ():void => {
        dispatch({ type: ActionType.ADD_COLUMN });
    };

    return (
        <div>
            {isLoading && <p>Loading table data...</p>}
            {error && <p>{error}</p>}
            <div className='input-group'>
                <button data-testid='table-add-row' onClick={() => void handleAddRow()}>Add Row</button>
                <button data-testid='table-add-column' onClick={handleAddColumn}>Add Column</button>
            </div>
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
