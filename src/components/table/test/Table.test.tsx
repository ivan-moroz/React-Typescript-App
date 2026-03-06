import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import Table from '../Table';

describe('Table Component', () => {
  const mockUsers = Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    age: 20 + i,
    city: `City ${i + 1}`,
  }));

  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockImplementation(async (_input, init) => {
      if (!init?.method || init.method === 'GET') {
        return {
          ok: true,
          json: async () => mockUsers,
        } as Response;
      }

      if (init.method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            id: 6,
            name: 'User 6',
            email: 'user6@example.com',
            age: 20,
            city: 'Unknown',
          }),
        } as Response;
      }

      throw new Error(`Unsupported method in test mock: ${init.method}`);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('adds a new row by posting to backend', async () => {
    render(<Table />);
    await screen.findByDisplayValue('User 1');
    fireEvent.click(screen.getByTestId('table-add-row'));

    await waitFor(() => expect(screen.getByDisplayValue('User 6')).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/api/users', expect.objectContaining({ method: 'POST' }));
  });

  test('adds a new column', async () => {
    render(<Table />);
    await screen.findByDisplayValue('User 1');
    fireEvent.click(screen.getByTestId('table-add-column'));
    expect(screen.getByText('column5')).toBeInTheDocument();
  });


  test('renders id column as non-editable text', async () => {
    render(<Table />);
    await waitFor(() => expect(screen.getByDisplayValue('User 1')).toBeInTheDocument());
    const firstBodyRow = document.querySelectorAll('tbody tr')[0];
    const idCell = firstBodyRow.querySelectorAll('td')[0];

    expect(idCell.querySelector('input')).toBeNull();
    expect(idCell).toHaveTextContent('1');
  });
});
