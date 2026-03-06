import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import Table from '../Table';

describe('Table Component', () => {
  const mockUsers = Array.from({ length: 2 }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    age: 20 + i,
    city: `City ${i + 1}`,
  }));

  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      if (init?.method === 'POST') {
        return {
          ok: true,
          json: async () => [{ id: 3, name: 'New User', email: 'new@example.com', age: 30, city: 'Berlin' }],
        } as Response;
      }

      return {
        ok: true,
        json: async () => mockUsers,
      } as Response;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('renders id column as non-editable text', async () => {
    render(<Table />);
    await waitFor(() => expect(screen.getByDisplayValue('User 1')).toBeInTheDocument());
    const firstBodyRow = document.querySelectorAll('tbody tr')[0];
    const idCell = firstBodyRow.querySelectorAll('td')[0];

    expect(idCell.querySelector('input')).toBeNull();
    expect(idCell).toHaveTextContent('1');
  });

  test('shows add user form', async () => {
    render(<Table />);
    await screen.findByDisplayValue('User 1');

    fireEvent.click(screen.getByTestId('table-add-user'));

    expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Age')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('City')).toBeInTheDocument();
  });

  test('submits new user and refreshes users list', async () => {
    render(<Table />);
    await screen.findByDisplayValue('User 1');

    fireEvent.click(screen.getByTestId('table-add-user'));

    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'New User' } });
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Age'), { target: { value: '30' } });
    fireEvent.change(screen.getByPlaceholderText('City'), { target: { value: 'Berlin' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save User' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/api/users', expect.objectContaining({ method: 'POST' }));
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/api/users');
    });
  });
});
