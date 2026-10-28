import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "./styles/styles.scss";
import { ActiveStyleProps } from "./types/types";

const activeStyle = ({ isActive }: ActiveStyleProps) => ({
	fontWeight: isActive ? "bold" : "normal",
});

export default function Navigation() {
	const navigate = useNavigate();
	const location = useLocation();
	const loginState =
		location.pathname === "/login"
			? location.state
			: {
					from: `${location.pathname}${location.search}${location.hash}`,
				};
	const authenticatedUser = getAuthenticatedUser();

	const handleLogout = async (): Promise<void> => {
		try {
			const response = await fetch("/api/auth/logout", { method: "POST" });
			if (!response.ok) return;
			sessionStorage.removeItem("authenticatedUser");
			navigate("/login", { state: loginState });
		} catch {
			// Keep the visible login state consistent if the session cannot be cleared.
		}
	};

	return (
		<nav>
			<NavLink to="/" style={activeStyle}>
				Home
			</NavLink>

			<NavLink to="/todo" style={activeStyle}>
				ToDo
			</NavLink>
			<NavLink to="/select" style={activeStyle}>
				Select
			</NavLink>
			<NavLink to="/calculator" style={activeStyle}>
				Calculator
			</NavLink>
			<NavLink to="/puzzle" style={activeStyle}>
				Puzzle
			</NavLink>
			<a href="/table">
				Users
			</a>
			<a href="/assets">
				Assets
			</a>
			{authenticatedUser ? (
				<div className="authenticated-user">
					<span>
						<b>{authenticatedUser.name}</b>
					</span>
					<button type="button" onClick={handleLogout}>
						Log out
					</button>
				</div>
			) : (
				<NavLink to={location.pathname === "/login" ? `/login${location.search}` : "/login"} state={loginState} style={activeStyle}>
					Login
				</NavLink>
			)}
		</nav>
	);
}

type AuthenticatedUser = {
	name: string;
};

function getAuthenticatedUser(): AuthenticatedUser | null {
	try {
		const storedUser = sessionStorage.getItem("authenticatedUser");
		if (!storedUser) {
			return null;
		}

		const user = JSON.parse(storedUser) as Partial<AuthenticatedUser>;
		return typeof user.name === "string" ? { name: user.name } : null;
	} catch {
		return null;
	}
}
