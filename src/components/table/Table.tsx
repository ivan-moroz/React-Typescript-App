import React, {useReducer} from "react";

import {initialState, reducer} from "./reducer/reducer";
import {ActionType} from "./types/types";

function EditableTable() {
    const [state, dispatch] = useReducer(reducer, initialState);

    const handleEdit = (id: number, column: string, value: string) => {
        dispatch({ type: ActionType.EDIT_CELL, payload: { id, column, value } });
    };

    const handleAddRow = () => {
        dispatch({ type: ActionType.ADD_ROW });
    };

    const handleAddColumn = () => {
        dispatch({ type: ActionType.ADD_COLUMN });
    };

    return (
        <div>
            <h1>Editable Table</h1>
            <div className='input-group'>
                <button onClick={handleAddRow}>Add Row</button>
                <button onClick={handleAddColumn}>Add Column</button>
            </div>
            <table border={1} style={{ marginTop: "10px", borderCollapse: "collapse" }}>
                <thead>
                <tr>
                    {Object.keys(state.users[0]).map((key) => (
                        <th key={key}>{key}</th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {state.users.map((user) => (
                    <tr key={user.id}>
                        {Object.entries(user).map(([key, value]) => (
                            <td key={key}>
                                <input
                                    type="text"
                                    value={value}
                                    onChange={(e) =>
                                        handleEdit(user.id, key, e.target.value)
                                    }
                                />
                            </td>
                        ))}
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};

export default EditableTable;