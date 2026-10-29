import Messaging from "../messaging/Messaging";
import { fetchData } from "../../utils/fetchData";
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
		const result = await fetchData("/api/auth/logout", {
			method: "POST",
			responseType: "void",
		});
		if (!result.success) return;
		sessionStorage.removeItem("authenticatedUser");
		navigate("/login", { state: loginState });
	};

	return (
		<nav className="app-navigation">
			<div className="navigation-inner">
				<NavLink to="/" className="brand-mark" aria-label="Studio home">
					<span className="brand-symbol">V</span>
					<span>STUDIO</span>
				</NavLink>
				<div className="navigation-links">
					<NavLink to="/" style={activeStyle}>
						Home
					</NavLink>
					<a
						href="/assets"
						aria-current={location.pathname === "/assets" ? "page" : undefined}
					>
						Library
					</a>
					<a
						href="/users"
						aria-current={location.pathname === "/users" ? "page" : undefined}
					>
						People
					</a>
					<a
						href="/messaging"
						aria-current={location.pathname === "/messaging" ? "page" : undefined}
					>
						Messages
					</a>
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
				</div>
				<div className="header-account">
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
					<NavLink
						to={
							location.pathname === "/login"
								? `/login${location.search}`
								: "/login"
						}
						state={loginState}
						style={activeStyle}
					>
						Login
					</NavLink>
				)}
				<Messaging key={authenticatedUser?.id ?? "anonymous"} />
				</div>
			</div>
		</nav>
	);
}

type AuthenticatedUser = {
	id?: number;
	name: string;
};

function getAuthenticatedUser(): AuthenticatedUser | null {
	try {
		const storedUser = sessionStorage.getItem("authenticatedUser");
		if (!storedUser) {
			return null;
		}

		const user = JSON.parse(storedUser) as Partial<AuthenticatedUser>;
		return typeof user.name === "string"
			? {
					name: user.name,
					...(typeof user.id === "number" &&
					Number.isInteger(user.id) &&
					user.id > 0
						? { id: user.id }
						: {}),
				}
			: null;
	} catch {
		return null;
	}
}
