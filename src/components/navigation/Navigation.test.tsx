import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Navigation from './Navigation';

describe('Navigation', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  test('shows the logged-in user name and allows logout', () => {
    sessionStorage.setItem('authenticatedUser', JSON.stringify({ name: 'Jane', email: 'jane@example.com' }));

    render(<MemoryRouter><Navigation /></MemoryRouter>);

    expect(screen.getByText('Signed in as Jane')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Login' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));

    expect(sessionStorage.getItem('authenticatedUser')).toBeNull();
  });
});
