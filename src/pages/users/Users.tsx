import React, {useEffect, useReducer, useRef, useState} from "react";

import {useModal} from '../../components/modal/ModalProvider';
import UserFormModal from './modals/UserFormModal';
import ConfirmationModal from '../../components/modal/ConfirmationModal';
import {initialState, reducer} from "./reducer/reducer";
import {ActionType, User} from "./types/types";
import './styles/styles.scss';

const PAGE_SIZE = 10;

function UsersTable() {
    const [state, dispatch] = useReducer(reducer, initialState);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
    const [hasMoreUsers, setHasMoreUsers] = useState<boolean>(true);
    const [error, setError] = useState<string>("");
    const {openModal} = useModal();
    const [draggedUserId, setDraggedUserId] = useState<number | null>(null);
    const [isSavingOrder, setIsSavingOrder] = useState<boolean>(false);
    const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
    const tableScrollContainerRef = useRef<HTMLDivElement | null>(null);
    const usersRef = useRef<User[]>([]);
    const isFetchingUsersRef = useRef<boolean>(false);


    useEffect(() => {
        usersRef.current = state.users;
    }, [state.users]);

    const loadUsers = async (reset = false): Promise<void> => {
        if (isFetchingUsersRef.current || (!reset && !hasMoreUsers)) {
            return;
        }

        isFetchingUsersRef.current = true;
        if (reset) {
            setIsLoading(true);
        } else {
            setIsLoadingMore(true);
        }
        setError("");
        try {
            const offset = reset ? 0 : usersRef.current.length;
            const response = await fetch(`/api/users?offset=${offset}&limit=${PAGE_SIZE}`);
            if (!response.ok) {
                throw new Error('Unable to fetch users');
            }

            const users: User[] = await response.json();
            const nextUsers = reset ? users : [...usersRef.current, ...users];
            usersRef.current = nextUsers;
            dispatch({type: reset ? ActionType.SET_USERS : ActionType.APPEND_USERS, payload: users});
            setHasMoreUsers(users.length === PAGE_SIZE);
        } catch {
            setError('Failed to load users from backend');
        } finally {
            isFetchingUsersRef.current = false;
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    };

    useEffect(() => {
        void loadUsers(true);
    }, []);

    useEffect(() => {
        const trigger = loadMoreTriggerRef.current;
        const scrollContainer = tableScrollContainerRef.current;
        if (!trigger || !scrollContainer || !hasMoreUsers || typeof IntersectionObserver === 'undefined') {
            return;
        }

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                void loadUsers();
            }
        }, { root: scrollContainer, rootMargin: '100px' });

        observer.observe(trigger);
        return () => observer.disconnect();
    }, [hasMoreUsers, state.users.length]);

    const handleStartCreateUser = () => openModal(UserFormModal, {onSaved: () => loadUsers(true)});
    const handleStartEditUser = (userId: number) => {
        const user = state.users.find((current) => current.id === userId);
        if (user) openModal(UserFormModal, {user, onSaved: () => loadUsers(true)});
    };
    const handleRequestDeleteUser = (user: User) => openModal(ConfirmationModal, {
        title: 'Delete user',
        message: `Are you sure to delete user ${user.name}?`,
        confirmLabel: 'Delete',
        onConfirm: async () => {
            setError('');
            const response = await fetch(`/api/users/${user.id}`, {method: 'DELETE'});
            if (!response.ok) throw new Error('Failed to delete user');
            await loadUsers(true);
        },
    });

    const handleDragStart = (userId: number): void => {
        setDraggedUserId(userId);
    };

    const handleDrop = async (targetUserId: number): Promise<void> => {
        if (draggedUserId === null || draggedUserId === targetUserId || isSavingOrder) {
            setDraggedUserId(null);
            return;
        }

        const previousUsers = state.users;
        const sourceIndex = previousUsers.findIndex((user) => user.id === draggedUserId);
        const targetIndex = previousUsers.findIndex((user) => user.id === targetUserId);
        if (sourceIndex === -1 || targetIndex === -1) {
            setDraggedUserId(null);
            return;
        }

        const reorderedUsers = [...previousUsers];
        const [movedUser] = reorderedUsers.splice(sourceIndex, 1);
        reorderedUsers.splice(targetIndex, 0, movedUser);

        usersRef.current = reorderedUsers;
        dispatch({type: ActionType.SET_USERS, payload: reorderedUsers});
        setDraggedUserId(null);
        setIsSavingOrder(true);
        setError('');

        try {
            const response = await fetch('/api/users/reorder', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userIds: reorderedUsers.map((user) => user.id) }),
            });

            if (!response.ok) {
                throw new Error('Unable to save user order');
            }

            await response.json();
        } catch {
            dispatch({type: ActionType.SET_USERS, payload: previousUsers});
            setError('Failed to save user order');
        } finally {
            setIsSavingOrder(false);
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
            <div className='user-table-container' ref={tableScrollContainerRef}>
            <table className="user-table" border={1} style={{ borderCollapse: "collapse" }}>
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
                    <tr
                        key={user.id}
                        data-testid={`user-row-${user.id}`}
                        draggable={!isSavingOrder}
                        aria-grabbed={draggedUserId === user.id}
                        className={draggedUserId === user.id ? 'is-dragging' : undefined}
                        onDragStart={() => handleDragStart(user.id)}
                        onDragEnd={() => setDraggedUserId(null)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => void handleDrop(user.id)}
                    >
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
            {hasMoreUsers && (
                <div ref={loadMoreTriggerRef} data-testid='users-load-more-trigger' className='users-load-more-trigger'>
                    {isLoadingMore && 'Loading more users...'}
                </div>
            )}
            </div>
            )}
        </div>
    );
};

export default UsersTable;
