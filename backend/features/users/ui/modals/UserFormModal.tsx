import { fetchData } from "../../../../shared/lib/fetchData";
import { ERROR_MESSAGES } from "../../../../constants/errors";
import React, { useState } from "react";
import Modal from "../../../../shared/ui/modal/Modal";
import type { ModalControls } from "../../../../shared/ui/modal/ModalProvider";
import type { User, UserFormState } from "../../model/types";
type Props = ModalControls & {
	user?: User;
	isRegistration?: boolean;
	onSaved: () => Promise<void>;
};
export default function UserFormModal({
	user,
	isRegistration = false,
	onSaved,
	onClose,
}: Props) {
	const isEditingUser = user !== undefined;
	const isRegistering = isRegistration && !isEditingUser;
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
			setFormError(ERROR_MESSAGES.FIELDS_REQUIRED);
			return;
		}

		const parsedAge = Number(userForm.age);
		if (!Number.isInteger(parsedAge) || parsedAge <= 0) {
			setFormError(ERROR_MESSAGES.AGE_INVALID);
			return;
		}

		setIsSubmitting(true);
		const result = await fetchData(
			isEditingUser ? `/api/users/${user?.id}` : "/api/users",
			{
				method: isEditingUser ? "PUT" : "POST",
				responseType: "void",
				errorMessage: isEditingUser ? ERROR_MESSAGES.USER_UPDATE_FAILED : ERROR_MESSAGES.USER_ADD_FAILED,
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

		if (!result.success) {
			setIsSubmitting(false);
			setFormError(result.error.message);
			return;
		}
		await onSaved();
		onClose();
		setIsSubmitting(false);
	};

	return (
		<Modal
			isOpen
			title={
				isEditingUser ? "Edit user" : isRegistering ? "Register" : "Create user"
			}
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
								: isRegistering
									? "Register"
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
