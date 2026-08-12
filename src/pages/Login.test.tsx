import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import LoginPage from './Login';

describe('LoginPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  test('authenticates with email and password before opening users management', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1, name: 'User 1', email: 'user1@example.com' }),
    } as Response);

    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user1@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: '12345' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user1@example.com', password: '12345' }),
      });
    });
    expect(sessionStorage.getItem('authenticatedUser')).toContain('user1@example.com');
  });

  test('shows an authentication error returned by the server', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Invalid email or password' }),
    } as Response);

    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user1@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });
});
