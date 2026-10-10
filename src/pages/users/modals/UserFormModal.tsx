import React, { useState } from "react";
import Modal from "../../../components/modal/Modal";
import type { ModalControls } from "../../../components/modal/ModalProvider";
import type { User, UserFormState } from "../types/types";
import "../styles/styles.scss";
type Props = ModalControls & { user?: User; onSaved: () => Promise<void> };
export default function UserFormModal({ user, onSaved, onClose }: Props) {
	const isEditingUser = user !== undefined;
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formError, setFormError] = useState("");
	const [userForm, setUserForm] = useState<UserFormState>(() => ({
		name: user ? String(user.name) : "",
		email: user ? String(user.email) : "",
		age: user ? String(user.age) : "",
		city: user ? String(user.city) : "",
		password: "",
	}));
	const handleInputChange = (
		field: keyof UserFormState,
		value: string,
	): void => {
		setUserForm((prevState) => ({ ...prevState, [field]: value }));
	};

	const handleSubmitUser = async (
		event: React.FormEvent<HTMLFormElement>,
	): Promise<void> => {
		event.preventDefault();
		setFormError("");

		if (
			!userForm.name.trim() ||
			!userForm.email.trim() ||
			!userForm.age.trim() ||
			!userForm.city.trim() ||
			(!isEditingUser && !userForm.password)
		) {
			setFormError("All fields are required");
			return;
		}

		const parsedAge = Number(userForm.age);
		if (!Number.isInteger(parsedAge) || parsedAge <= 0) {
			setFormError("Age must be a positive number");
			return;
		}

		setIsSubmitting(true);
		try {
			const response = await fetch(
				isEditingUser ? `/api/users/${user?.id}` : "/api/users",
				{
					method: isEditingUser ? "PUT" : "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						name: userForm.name.trim(),
						email: userForm.email.trim(),
						age: parsedAge,
						city: userForm.city.trim(),
						...(userForm.password
							? { password: userForm.password }
							: {}),
					}),
				},
			);

			if (!response.ok) {
				const responseBody = await response.json().catch(() => null);
				const message =
					typeof responseBody?.message === "string"
						? responseBody.message
						: isEditingUser
							? "Failed to update user"
							: "Failed to add user";
				throw new Error(message);
			}

			await onSaved();
			onClose();
		} catch (error) {
			setFormError(
				error instanceof Error
					? error.message
					: isEditingUser
						? "Failed to update user"
						: "Failed to add user",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Modal
			isOpen
			title={isEditingUser ? "Edit user" : "Create user"}
			onClose={onClose}
			footer={
				<>
					<button type="button" onClick={onClose}>
						Cancel
					</button>
					<button
						type="submit"
						form="user-form"
						disabled={isSubmitting}
					>
						{isSubmitting
							? "Saving..."
							: isEditingUser
								? "Update User"
								: "Save User"}
					</button>
				</>
			}
		>
			<form
				id="user-form"
				className="add-user-form"
				onSubmit={(event) => void handleSubmitUser(event)}
			>
				<input
					type="text"
					placeholder="Name"
					value={userForm.name}
					onChange={(event) =>
						handleInputChange("name", event.target.value)
					}
				/>
				<input
					type="email"
					placeholder="Email"
					value={userForm.email}
					onChange={(event) =>
						handleInputChange("email", event.target.value)
					}
				/>
				<input
					type="number"
					placeholder="Age"
					value={userForm.age}
					onChange={(event) =>
						handleInputChange("age", event.target.value)
					}
				/>
				<input
					type="text"
					placeholder="City"
					value={userForm.city}
					onChange={(event) =>
						handleInputChange("city", event.target.value)
					}
				/>
				<input
					type="password"
					placeholder={
						isEditingUser
							? "Password (leave blank to keep current)"
							: "Password"
					}
					value={userForm.password}
					onChange={(event) =>
						handleInputChange("password", event.target.value)
					}
				/>
				{formError && <p>{formError}</p>}
			</form>
		</Modal>
	);
}
