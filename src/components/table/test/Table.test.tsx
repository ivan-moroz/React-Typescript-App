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
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockUsers,
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('adds a new row', async () => {
    render(<Table />);
    await screen.findByDisplayValue('User 1');
    fireEvent.click(screen.getByTestId('table-add-row'));
    const rows = document.querySelectorAll('table tr');
    expect(rows.length).toBe(7);
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
