import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders todo List', () => {
  render(<App />);
  const linkElement = screen.getByText(/ToDo List/i);
  expect(linkElement).toBeInTheDocument();
});
