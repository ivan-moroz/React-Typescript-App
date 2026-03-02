import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ToDo from '../ToDo';

describe('ToDo Component', () => {
  test('adds a new todo', () => {
    render(<ToDo />);
    const input = screen.getByTestId('todo-input');
    const addButton = screen.getByTestId('todo-add-button');

    fireEvent.change(input, { target: { value: 'New Todo' } });
    fireEvent.click(addButton);

    expect(screen.getByText('New Todo')).toBeInTheDocument();
  });

  test('moves removed todo to deleted items section', () => {
    render(<ToDo />);

    const removeButton = screen.getByRole('button', { name: '❌' });
    fireEvent.click(removeButton);

    const deletedSection = screen.getByTestId('deleted-items-section');
    expect(deletedSection).toHaveTextContent('Learn React + TypeScript');
  });

  test('restores item from deleted items section', () => {
    render(<ToDo />);

    fireEvent.click(screen.getByRole('button', { name: '❌' }));
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));

    expect(screen.getByText('Learn React + TypeScript')).toBeInTheDocument();
    expect(screen.getByText('No deleted items yet.')).toBeInTheDocument();
  });
});
