import React from 'react';
import { useReducer } from 'react';

import { reducer, initialState } from './reducer/reducer';
import { ActionType } from './types/types';
import './styles/styles.css';

function Calculator() {
    const [state, dispatch] = useReducer(reducer, initialState);

    const handleNumberClick = (number: string) => {
        dispatch({ type: ActionType.ADD_NUMBER, payload: number });
    };

    const handleOperationClick = (operation: string) => {
        dispatch({ type: ActionType.SET_OPERATION, payload: operation });
    };

    const handleCalculate = () => {
        dispatch({ type: ActionType.CALCULATE });
    };

    const handleClear = () => {
        dispatch({ type: ActionType.CLEAR });
    };

    return (
        <div className="calculator">
            <div className="display">{state.display}</div>
            <div className="buttons">
                <div className="numbers">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
                        <button key={num} onClick={() => handleNumberClick(num.toString())}>
                            {num}
                        </button>
                    ))}
                </div>
                <div className="operations">
                    {['+', '-', '*', '/'].map((op) => (
                        <button key={op} onClick={() => handleOperationClick(op)}>
                            {op}
                        </button>
                    ))}
                </div>
                <button className="calculate" onClick={handleCalculate}>
                    =
                </button>
                <button className="clear" onClick={handleClear}>
                    C
                </button>
            </div>
        </div>
    );
};

export default Calculator;