import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import Table from '../Table';

describe('Table Component', () => {
  test('adds a new row', () => {
    render(<Table />);
    fireEvent.click(screen.getByTestId('table-add-row'));
    const rows = document.querySelectorAll('table tr');
    expect(rows.length).toBe(7);
  });

  test('adds a new column', () => {
    render(<Table />);
    fireEvent.click(screen.getByTestId('table-add-column'));
    expect(screen.getByText('column5')).toBeInTheDocument();
  });
});
