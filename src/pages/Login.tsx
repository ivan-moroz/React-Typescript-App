import { ERROR_MESSAGES } from "../constants/errors";
import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import "../styles/login.scss";

export default function LoginPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const from = location.state?.from ?? new URLSearchParams(location.search).get("from");
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
	const [alreadyAuthenticated] = useState(() => {
		try {
			const user = JSON.parse(sessionStorage.getItem("authenticatedUser") ?? "null");
			return typeof user?.name === "string";
		} catch {
			return false;
		}
	});

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError("");
		setIsSubmitting(true);

		try {
			const response = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			});
			const payload = await response.json();

			if (!response.ok) {
				throw new Error(
					typeof payload?.message === "string"
						? payload.message
						: ERROR_MESSAGES.LOGIN_FAILED,
				);
			}

			sessionStorage.setItem(
				"authenticatedUser",
				JSON.stringify(payload),
			);
			if (["/assets", "/users"].includes(returnTo.split(/[?#]/)[0])) {
				window.location.assign(returnTo);
			} else {
				navigate(returnTo, { replace: true });
			}
		} catch (error) {
			setError(
				error instanceof Error ? error.message : ERROR_MESSAGES.LOGIN_FAILED,
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	if (alreadyAuthenticated) return <Navigate to="/" replace />;

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
