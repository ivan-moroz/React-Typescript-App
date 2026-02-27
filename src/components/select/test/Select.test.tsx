import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Select from '../Select';

let value = 'vue';

const options = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'angular', label: 'Angular' },
  { value: 'svelte', label: 'Svelte' },
  { value: 'solid', label: 'Solid' }
];

const setValue = (v: string | string[]) => {
  value = Array.isArray(v) ? v[0] ?? '' : v;
};

describe('Select Component', () => {
  test('display title', () => {
    render(<Select options={options} value={value} onChange={setValue} />);
    const toDoTitle = screen.getByText(/Select/i);
    expect(toDoTitle).toBeInTheDocument();
  });

  test('opens the menu when clicked', () => {
    render(<Select options={options} value={value} onChange={setValue} />);
    const control = screen.getByTestId('select-trigger');
    fireEvent.click(control);
    expect(screen.getByTestId('select-listbox')).toBeInTheDocument();
  });

  test('calls onChange when an option is selected', () => {
    const onChange = jest.fn();
    render(<Select options={options} value={value} onChange={onChange} />);
    const control = screen.getByTestId('select-trigger');
    fireEvent.click(control);
    fireEvent.click(screen.getByText('React'));
    expect(onChange).toHaveBeenCalledWith('react');
  });

  test('supports multi-select values', () => {
    const onChange = jest.fn();
    render(<Select options={options} value={['vue']} onChange={onChange} multiple />);

    fireEvent.click(screen.getByTestId('select-trigger'));
    fireEvent.click(screen.getByText('React'));

    expect(onChange).toHaveBeenCalledWith(['vue', 'react']);
  });
});
