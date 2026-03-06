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

  test('creates a user and refreshes the table', async () => {
    const updatedUsers = [
      ...mockUsers,
      { id: 6, name: 'John', email: 'john@example.com', age: 31, city: 'Warsaw' },
    ];

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 6, name: 'John', email: 'john@example.com', age: 31, city: 'Warsaw' }],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => updatedUsers,
      } as Response);

    render(<Table />);

    await screen.findByDisplayValue('User 1');
    fireEvent.click(screen.getByTestId('table-add-user'));

    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Age'), { target: { value: '31' } });
    fireEvent.change(screen.getByPlaceholderText('City'), { target: { value: 'Warsaw' } });

    fireEvent.click(screen.getByText('Save User'));

    await waitFor(() => {
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    });
  });
});
