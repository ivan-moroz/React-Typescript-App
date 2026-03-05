import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ToDo from '../ToDo';

describe('ToDo Component', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        id: 1,
        text: 'Learn React + TypeScript',
        completed: false,
      }),
    } as Response);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test('adds a new todo', async () => {
    render(<ToDo />);
    const input = screen.getByTestId('todo-input');
    const addButton = screen.getByTestId('todo-add-button');

    fireEvent.change(input, { target: { value: 'New Todo' } });
    fireEvent.click(addButton);

    expect(screen.getByText('New Todo')).toBeInTheDocument();
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/api/todo');
    });
  });

  test('moves removed todo to deleted items section', async () => {
    render(<ToDo />);

    const removeButton = await screen.findByRole('button', { name: 'Remove todo' });
    fireEvent.click(removeButton);

    const deletedSection = screen.getByTestId('deleted-items-section');
    expect(deletedSection).toHaveTextContent('Learn React + TypeScript');
  });

  test('restores item from deleted items section', async () => {
    render(<ToDo />);

    fireEvent.click(await screen.findByRole('button', { name: 'Remove todo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Restore todo' }));

    expect(screen.getByText('Learn React + TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Nothing found')).toBeInTheDocument();
  });
});
