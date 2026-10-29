import { fetchData } from "../utils/fetchData";
import { ERROR_MESSAGES } from "../constants/errors";
import { FormEvent, useState } from "react";
import { useLocation } from "react-router-dom";

import "../styles/login.scss";

export default function LoginPage() {
	const location = useLocation();
	const from =
		location.state?.from ??
		new URLSearchParams(location.search).get("from");
	const returnTo =
		typeof from === "string" &&
		from.startsWith("/") &&
		!from.startsWith("//") &&
		!from.includes("\\") &&
		from.split(/[?#]/)[0] !== "/login"
			? from
			: "/";
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError("");
		setIsSubmitting(true);

		const result = await fetchData<{
			id: number;
			name: string;
			email: string;
		}>("/api/auth/login", {
			method: "POST",
			errorMessage: ERROR_MESSAGES.LOGIN_FAILED,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password }),
		});

		setIsSubmitting(false);
		if (!result.success) {
			setError(result.error.message);
			return;
		}
		const payload = result.data;
		sessionStorage.setItem("authenticatedUser", JSON.stringify(payload));
		window.location.assign(returnTo);
	};

	return (
		<main className="app login-page">
			<h1>Log in</h1>
			<form onSubmit={(event) => void handleSubmit(event)}>
				<label>
					Email
					<input
						type="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						autoComplete="email"
						required
					/>
				</label>
				<label>
					Password
					<input
						type="password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						autoComplete="current-password"
						required
					/>
				</label>
				{error && <p role="alert">{error}</p>}
				<button type="submit" disabled={isSubmitting}>
					{isSubmitting ? "Logging in..." : "Log in"}
				</button>
			</form>
		</main>
	);
}
