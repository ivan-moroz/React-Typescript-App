import { State, Action, ActionType } from '../types/types';

export const initialState: State = {
    display: '',
    firstOperand: null,
    secondOperand: null,
    operation: null,
};

export const reducer = (state: State, action: Action): State => {
    switch (action.type) {
        case ActionType.ADD_NUMBER:
            return {
                ...state,
                display: state.display + action.payload,
            };
        case ActionType.SET_OPERATION:
            return {
                ...state,
                firstOperand: parseFloat(state.display),
                operation: action.payload,
                display: '',
            };
        case ActionType.CALCULATE:
            if (state.firstOperand !== null && state.operation && state.display) {
                const secondOperand = parseFloat(state.display);
                let result = 0;

                switch (state.operation) {
                    case '+':
                        result = state.firstOperand + secondOperand;
                        break;
                    case '-':
                        result = state.firstOperand - secondOperand;
                        break;
                    case '*':
                        result = state.firstOperand * secondOperand;
                        break;
                    case '/':
                        result = state.firstOperand / secondOperand;
                        break;
                    default:
                        break;
                }

                return {
                    ...state,
                    display: result.toString(),
                    firstOperand: null,
                    secondOperand: null,
                    operation: null,
                };
            }
            return state;
        case ActionType.CLEAR:
            return initialState;
        default:
            return state;
    }
};