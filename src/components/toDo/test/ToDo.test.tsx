import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import ToDo from '../ToDo';

describe('ToDo Component', () => {
  test('display title', () => {
    render(<ToDo />);
    const toDoTitle = screen.getByText(/ToDo List/i);
    expect(toDoTitle).toBeInTheDocument();
  });

  test('adds a new todo', () => {
    render(<ToDo />);
    const input = screen.getByTestId('todo-input');
    const addButton = screen.getByTestId('todo-add--button');

    fireEvent.change(input, { target: { value: 'New Todo' } });
    fireEvent.click(addButton);

    expect(screen.getByText('New Todo')).toBeInTheDocument();
  });
});
