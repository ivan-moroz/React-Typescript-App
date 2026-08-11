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

  test('does not render add row and add column actions', async () => {
    render(<Table />);
    await screen.findByText('User 1');

    expect(screen.queryByTestId('table-add-row')).not.toBeInTheDocument();
    expect(screen.queryByTestId('table-add-column')).not.toBeInTheDocument();
  });

  test('renders table cells as non-editable text', async () => {
    render(<Table />);
    await waitFor(() => expect(screen.getByText('User 1')).toBeInTheDocument());
    const firstBodyRow = document.querySelectorAll('tbody tr')[0];
    expect(firstBodyRow.querySelector('input')).toBeNull();
    expect(firstBodyRow).toHaveTextContent('1');
    expect(firstBodyRow).toHaveTextContent('User 1');
    expect(firstBodyRow).toHaveTextContent('user1@example.com');
    expect(firstBodyRow).toHaveTextContent('20');
    expect(firstBodyRow).toHaveTextContent('City 1');
  });


  test('deletes a user from the table', async () => {
    const usersAfterDelete = mockUsers.slice(1);

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'User deleted' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => usersAfterDelete,
      } as Response);

    render(<Table />);

    await screen.findByText('User 1');

    fireEvent.click(screen.getByLabelText('Delete user User 1'));
    expect(screen.getByRole('dialog')).toHaveTextContent('Are you sure to delete user User 1');

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(screen.queryByText('User 1')).not.toBeInTheDocument();
    });

    expect(screen.getByText('User 2')).toBeInTheDocument();
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

    await screen.findByText('User 1');
    fireEvent.click(screen.getByTestId('table-add-user'));

    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Age'), { target: { value: '31' } });
    fireEvent.change(screen.getByPlaceholderText('City'), { target: { value: 'Warsaw' } });

    fireEvent.click(screen.getByText('Save User'));

    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument();
    });
  });

  test('shows a clear error when adding a user with an email address already in use', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => mockUsers } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ message: 'Email address is already in use' }),
      } as Response);

    render(<Table />);

    await screen.findByText('User 1');
    fireEvent.click(screen.getByTestId('table-add-user'));
    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Another User' } });
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'user1@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Age'), { target: { value: '31' } });
    fireEvent.change(screen.getByPlaceholderText('City'), { target: { value: 'Warsaw' } });
    fireEvent.click(screen.getByText('Save User'));

    expect(await screen.findByText('Email address is already in use')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('loads the next page when the table scroll reaches the bottom', async () => {
    const firstPage = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      age: 20 + i,
      city: `City ${i + 1}`,
    }));
    const secondPage = [{ id: 11, name: 'User 11', email: 'user11@example.com', age: 30, city: 'City 11' }];
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => firstPage } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => secondPage } as Response);

    let observeCallback: IntersectionObserverCallback | undefined;
    const originalIntersectionObserver = window.IntersectionObserver;
    class MockIntersectionObserver {
      constructor(callback: IntersectionObserverCallback) {
        observeCallback = callback;
      }
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
      takeRecords = vi.fn(() => []);
    }
    window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

    try {
      render(<Table />);
      await screen.findByText('User 10');

      expect(fetchMock).toHaveBeenCalledWith('/api/users?offset=0&limit=10');
      observeCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);

      await screen.findByText('User 11');
      expect(fetchMock).toHaveBeenCalledWith('/api/users?offset=10&limit=10');
    } finally {
      window.IntersectionObserver = originalIntersectionObserver;
    }
  });

  test('reorders users by drag and drop and saves the new order', async () => {
    const reorderedUsers = [mockUsers[1], mockUsers[0], ...mockUsers.slice(2)];
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => mockUsers } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => reorderedUsers } as Response);

    render(<Table />);

    await screen.findByText('User 1');
    fireEvent.dragStart(screen.getByTestId('user-row-2'));
    fireEvent.dragOver(screen.getByTestId('user-row-1'));
    fireEvent.drop(screen.getByTestId('user-row-1'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/users/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: reorderedUsers.map((user) => user.id) }),
      });
    });

    await waitFor(() => {
      expect(document.querySelectorAll('tbody tr')[0]).toHaveTextContent('User 2');
    });
  });

  test('edits a user through the user form and refreshes the table', async () => {
    const updatedUsers = mockUsers.map((user) =>
      user.id === 1
        ? { ...user, name: 'Jane', email: 'jane@example.com', age: 34, city: 'Berlin' }
        : user
    );

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, name: 'Jane', email: 'jane@example.com', age: 34, city: 'Berlin' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => updatedUsers,
      } as Response);

    render(<Table />);

    await screen.findByText('User 1');
    fireEvent.click(screen.getByLabelText('Edit user User 1'));

    fireEvent.change(screen.getAllByDisplayValue('User 1')[0], { target: { value: 'Jane' } });
    fireEvent.change(screen.getAllByDisplayValue('user1@example.com')[0], { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getAllByDisplayValue('20')[0], { target: { value: '34' } });
    fireEvent.change(screen.getAllByDisplayValue('City 1')[0], { target: { value: 'Berlin' } });

    fireEvent.click(screen.getByText('Update User'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/users/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Jane',
          email: 'jane@example.com',
          age: 34,
          city: 'Berlin',
        }),
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Jane')).toBeInTheDocument();
    });
  });

  test('shows a clear error when editing a user to an email address already in use', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => mockUsers } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ message: 'Email address is already in use' }),
      } as Response);

    render(<Table />);

    await screen.findByText('User 1');
    fireEvent.click(screen.getByLabelText('Edit user User 1'));
    fireEvent.change(screen.getAllByDisplayValue('user1@example.com')[0], { target: { value: 'user2@example.com' } });
    fireEvent.click(screen.getByText('Update User'));

    expect(await screen.findByText('Email address is already in use')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
