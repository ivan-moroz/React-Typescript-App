import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import Calculator from '../Calculator';

describe('Calculator Component', () => {
  test('display title', () => {
    render(<Calculator />);
    const toDoTitle = screen.getByText(/Calculator/i);
    expect(toDoTitle).toBeInTheDocument();
  });

  test('handles number button clicks', () => {
    render(<Calculator />);
    const button1 = screen.getByText('1');
    const button2 = screen.getByText('2');

    fireEvent.click(button1);
    fireEvent.click(button2);

    expect(screen.getByText('12')).toBeInTheDocument();
  });

  test('handles operation button clicks', () => {
    render(<Calculator />);
    const button1 = screen.getByText('6');
    const buttonPlus = screen.getByText('+');
    const button2 = screen.getByText('7');
    const equalsButton = screen.getByText('=');

    fireEvent.click(button1);
    fireEvent.click(buttonPlus);
    fireEvent.click(button2);
    fireEvent.click(equalsButton);

    expect(screen.getByText('13')).toBeInTheDocument();
  });
});
