import React from 'react';
import {fireEvent, render, screen, within} from '@testing-library/react';
import ToDo from '../ToDo';

describe('ToDo Component', () => {
  test('display deleted section', () => {
    render(<ToDo />);
    expect(screen.getByText(/Видалені/i)).toBeInTheDocument();
  });

  test('adds a new todo', () => {
    render(<ToDo />);
    const input = screen.getByTestId('todo-input');
    const addButton = screen.getByTestId('todo-add-button');

    fireEvent.change(input, { target: { value: 'New Todo' } });
    fireEvent.click(addButton);

    expect(screen.getByText('New Todo')).toBeInTheDocument();
  });

  test('moves todo to deleted section', () => {
    render(<ToDo />);

    const removeButton = screen.getByText('❌');
    fireEvent.click(removeButton);

    const deletedSection = screen.getByRole('heading', { name: /Видалені/i }).closest('section');
    expect(deletedSection).toBeInTheDocument();

    if (!deletedSection) {
      throw new Error('Deleted section was not found');
    }

    expect(within(deletedSection).getByText('Learn React + TypeScript')).toBeInTheDocument();
  });
});
