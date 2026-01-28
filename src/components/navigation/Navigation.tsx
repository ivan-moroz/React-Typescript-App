import { NavLink } from 'react-router-dom';
import './styles/styles.css';

export default function Navigation() {
    return (
        <nav>
            <NavLink
                to="/"
                style={({ isActive }) => ({
                    fontWeight: isActive ? 'bold' : 'normal'
                })}
            >
                Home
            </NavLink>

            <NavLink
                to="/todo"
                style={({ isActive }) => ({
                    fontWeight: isActive ? 'bold' : 'normal'
                })}
            >
                ToDo
            </NavLink>
            <NavLink
                to="/select"
                style={({ isActive }) => ({
                    fontWeight: isActive ? 'bold' : 'normal'
                })}
            >
                Select
            </NavLink>
            <NavLink
                to="/table"
                style={({ isActive }) => ({
                    fontWeight: isActive ? 'bold' : 'normal'
                })}
            >
                Table
            </NavLink>
        </nav>
    );
}
