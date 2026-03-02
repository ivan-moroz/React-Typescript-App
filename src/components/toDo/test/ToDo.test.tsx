import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
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

  test('shows removed items in deleted items section', () => {
    const { container } = render(<ToDo />);

    const initialTodo = screen.getByText('Learn React + TypeScript');
    expect(initialTodo).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '❌' }));

    const todoList = container.querySelector('.todo-list');
    expect(todoList).not.toHaveTextContent('Learn React + TypeScript');
    expect(screen.getByRole('heading', { name: /Deleted Items/i })).toBeInTheDocument();
    expect(screen.getByText('Learn React + TypeScript')).toBeInTheDocument();
  });
});
