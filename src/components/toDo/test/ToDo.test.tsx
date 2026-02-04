import React from 'react';
import { render, screen } from '@testing-library/react';
import ToDo from '../ToDo';

test('Renders ToDo List', () => {
  render(<ToDo />);
  const toDoTitle = screen.getByText(/ToDo List/i);
  expect(toDoTitle).toBeInTheDocument();
});
