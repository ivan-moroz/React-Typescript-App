import { NavLink, useNavigate } from 'react-router-dom';
import './styles/styles.scss';
import {ActiveStyleProps} from "./types/types";

const activeStyle = ({ isActive }: ActiveStyleProps) => ({
    fontWeight: isActive ? 'bold' : 'normal'
});

export default function Navigation() {
    const navigate = useNavigate();
    const authenticatedUser = getAuthenticatedUser();

    const handleLogout = (): void => {
        sessionStorage.removeItem('authenticatedUser');
        navigate('/login');
    };

    return (
        <nav>
            <NavLink
                to="/"
                style={activeStyle}
            >
                Home
            </NavLink>

            <NavLink
                to="/todo"
                style={activeStyle}
            >
                ToDo
            </NavLink>
            <NavLink
                to="/select"
                style={activeStyle}
            >
                Select
            </NavLink>
            <NavLink
                to="/table"
                style={activeStyle}
            >
                Users
            </NavLink>
            <NavLink
                to="/calculator"
                style={activeStyle}
            >
                Calculator
            </NavLink>
            {authenticatedUser ? (
                <div className='authenticated-user'>
                    <span><b>{authenticatedUser.name}</b></span>
                    <button type='button' onClick={handleLogout}>Log out</button>
                </div>
            ) : (
                <NavLink
                    to="/login"
                    style={activeStyle}
                >
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
        const storedUser = sessionStorage.getItem('authenticatedUser');
        if (!storedUser) {
            return null;
        }

        const user = JSON.parse(storedUser) as Partial<AuthenticatedUser>;
        return typeof user.name === 'string' ? { name: user.name } : null;
    } catch {
        return null;
    }
}
