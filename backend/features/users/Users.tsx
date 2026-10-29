"use client";

import { fetchData } from "../../../src/utils/fetchData";
import { ERROR_MESSAGES } from "../../../src/constants/errors";
import React, { useEffect, useReducer, useRef, useState } from "react";

import { useModal } from "../../../src/components/modal/useModal";
import UserFormModal from "./modals/UserFormModal";
import ConfirmationModal from "../../../src/components/modal/ConfirmationModal";
import { initialState, reducer } from "./reducer/reducer";
import { ActionType, User } from "./types/types";
import Table, { type TableColumn } from "../../../src/components/table/Table";

const PAGE_SIZE = 10;

export type UsersTableProps = { initialUsers?: User[]; initialError?: string };

function UsersTable({ initialUsers, initialError = "" }: UsersTableProps) {
	const [state, dispatch] = useReducer(reducer, { ...initialState, users: initialUsers ?? [] });
	const [isLoading, setIsLoading] = useState<boolean>(initialUsers === undefined);
	const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
	const [hasMoreUsers, setHasMoreUsers] = useState<boolean>(initialUsers === undefined || initialUsers.length === PAGE_SIZE);
	const [error, setError] = useState<string>(initialError);
	const { openModal } = useModal();
	const [draggedUserId, setDraggedUserId] = useState<number | null>(null);
	const [isSavingOrder, setIsSavingOrder] = useState<boolean>(false);
	const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
	const tableScrollContainerRef = useRef<HTMLDivElement | null>(null);
	const usersRef = useRef<User[]>(initialUsers ?? []);
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
		const offset = reset ? 0 : usersRef.current.length;
		const result = await fetchData<User[]>(
			`/api/users?offset=${offset}&limit=${PAGE_SIZE}`,
			{ errorMessage: ERROR_MESSAGES.USERS_FETCH_FAILED },
		);
		isFetchingUsersRef.current = false;
		setIsLoading(false);
		setIsLoadingMore(false);
		if (!result.success) {
			setError(ERROR_MESSAGES.USERS_LOAD_FAILED);
			return;
		}
		const users = result.data;
		const nextUsers = reset ? users : [...usersRef.current, ...users];
		usersRef.current = nextUsers;
		dispatch({
			type: reset ? ActionType.SET_USERS : ActionType.APPEND_USERS,
			payload: users,
		});
		setHasMoreUsers(users.length === PAGE_SIZE);
	};

	useEffect(() => {
		if (initialUsers === undefined) void loadUsers(true);
	}, []);

	useEffect(() => {
		const trigger = loadMoreTriggerRef.current;
		const scrollContainer = tableScrollContainerRef.current;
		if (
			!trigger ||
			!scrollContainer ||
			!hasMoreUsers ||
			typeof IntersectionObserver === "undefined"
		) {
			return;
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					void loadUsers();
				}
			},
			{ root: scrollContainer, rootMargin: "100px" },
		);

		observer.observe(trigger);
		return () => observer.disconnect();
	}, [hasMoreUsers, state.users.length]);

	const handleStartCreateUser = () =>
		openModal(UserFormModal, { onSaved: () => loadUsers(true) });
	const handleStartEditUser = (userId: number) => {
		const user = state.users.find((current) => current.id === userId);
		if (user)
			openModal(UserFormModal, { user, onSaved: () => loadUsers(true) });
	};
	const handleRequestDeleteUser = (user: User) =>
		openModal(ConfirmationModal, {
			title: "Delete user",
			message: `Are you sure to delete user ${user.name}?`,
			confirmLabel: "Delete",
			onConfirm: async () => {
				setError("");
				const result = await fetchData(`/api/users/${user.id}`, {
					responseType: "void",
					errorMessage: ERROR_MESSAGES.USER_DELETE_FAILED,
					method: "DELETE",
				});
				if (!result.success) throw result.error;
				await loadUsers(true);
			},
		});

	const handleDragStart = (userId: number): void => {
		setDraggedUserId(userId);
	};

	const handleDrop = async (targetUserId: number): Promise<void> => {
		if (
			draggedUserId === null ||
			draggedUserId === targetUserId ||
			isSavingOrder
		) {
			setDraggedUserId(null);
			return;
		}

		const previousUsers = state.users;
		const sourceIndex = previousUsers.findIndex(
			(user) => user.id === draggedUserId,
		);
		const targetIndex = previousUsers.findIndex(
			(user) => user.id === targetUserId,
		);
		if (sourceIndex === -1 || targetIndex === -1) {
			setDraggedUserId(null);
			return;
		}

		const reorderedUsers = [...previousUsers];
		const [movedUser] = reorderedUsers.splice(sourceIndex, 1);
		reorderedUsers.splice(targetIndex, 0, movedUser);

		usersRef.current = reorderedUsers;
		dispatch({ type: ActionType.SET_USERS, payload: reorderedUsers });
		setDraggedUserId(null);
		setIsSavingOrder(true);
		setError("");

		const result = await fetchData("/api/users/reorder", {
			responseType: "void",
			errorMessage: ERROR_MESSAGES.USER_ORDER_SAVE_FAILED,
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				userIds: reorderedUsers.map((user) => user.id),
			}),
		});

		if (!result.success) {
			usersRef.current = previousUsers;
			dispatch({ type: ActionType.SET_USERS, payload: previousUsers });
			setError(ERROR_MESSAGES.USER_ORDER_FAILED);
		}
		setIsSavingOrder(false);
	};

	const columns: TableColumn<User>[] = [
		...Object.keys(state.users[0] ?? {}).map((key) => ({
			key,
			header: key,
			render: (user: User) => <span>{user[key]}</span>,
		})),
		{
			key: "user-actions",
			header: "actions",
			render: (user) => (
				<>
					<button
						type="button"
						aria-label={`Edit user ${user.name}`}
						onClick={() => handleStartEditUser(user.id)}
					>
						<span className="material-icons" aria-hidden="true">edit</span>
					</button>
					<button
						type="button"
						aria-label={`Delete user ${user.name}`}
						onClick={() => handleRequestDeleteUser(user)}
					>
						<span className="material-icons" aria-hidden="true">delete</span>
					</button>
				</>
			),
		},
	];
	return (
		<div>
			{isLoading && <p>Loading table data...</p>}
			{error && <p>{error}</p>}
			<div className="input-group">
				<button
					data-testid="table-add-user"
					onClick={handleStartCreateUser}
				>
					Add User
				</button>
			</div>
			{state.users.length === 0 ? (
				!isLoading && !error ? (
					<p>No users found.</p>
				) : null
			) : (
				<div
					className="user-table-container"
					ref={tableScrollContainerRef}
				>
					<Table
						className="user-table"
						columns={columns}
						data={state.users}
						getRowKey={(user) => user.id}
						getRowProps={(user) => ({
							"data-testid": `user-row-${user.id}`,
							draggable: !isSavingOrder,
							"aria-grabbed": draggedUserId === user.id,
							className:
								draggedUserId === user.id
									? "is-dragging"
									: undefined,
							onDragStart: () => handleDragStart(user.id),
							onDragEnd: () => setDraggedUserId(null),
							onDragOver: (event) => event.preventDefault(),
							onDrop: () => void handleDrop(user.id),
						})}
					/>
					{hasMoreUsers && (
						<div
							ref={loadMoreTriggerRef}
							data-testid="users-load-more-trigger"
							className="users-load-more-trigger"
						>
							{isLoadingMore && "Loading more users..."}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

export default UsersTable;
