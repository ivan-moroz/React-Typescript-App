export interface State {
    display: string;
    firstOperand: number | null;
    secondOperand: number | null;
    operation: string | null;
}

export enum ActionType {
    ADD_NUMBER = 'ADD_NUMBER',
    SET_OPERATION = 'SET_OPERATION',
    CALCULATE = 'CALCULATE',
    CLEAR = 'CLEAR',
}

export type Action =
    | { type: ActionType.ADD_NUMBER; payload: string }
    | { type: ActionType.SET_OPERATION; payload: string }
    | { type: ActionType.CALCULATE }
    | { type: ActionType.CLEAR };