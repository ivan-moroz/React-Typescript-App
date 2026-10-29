import Users, { type UsersTableProps } from './Users'
import React from "react";

export default function UsersPage(props: UsersTableProps) {
    return (
        <div className="app wide">
            <h1>Users management</h1>
            <Users {...props} />
        </div>
    );
}
