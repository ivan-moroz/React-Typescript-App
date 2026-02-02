import { NavLink } from 'react-router-dom';
import './styles/styles.css';
import {ActiveStyleProps} from "./types/types";

const activeStyle = ({ isActive }: ActiveStyleProps) => ({
    fontWeight: isActive ? 'bold' : 'normal'
});

export default function Navigation() {
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
                Table
            </NavLink>
            <NavLink
                to="/calculator"
                style={activeStyle}
            >
                Calculator
            </NavLink>
        </nav>
    );
}
