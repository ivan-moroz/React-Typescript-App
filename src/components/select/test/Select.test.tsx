import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import { vi } from 'vitest';
import Select from '../Select';

let value: string | undefined = 'vue';

const options = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'angular', label: 'Angular' },
  { value: 'svelte', label: 'Svelte' },
  { value: 'solid', label: 'Solid' }
];

const setValue = (v: string | undefined) => {
  value = v;
}

describe('Select Component', () => {
  test('opens the menu when clicked', () => {
    render(<Select options={options} value={value} onChange={setValue} />);
    const control = screen.getByTestId('select-trigger');
    fireEvent.click(control);
    expect(screen.getByTestId('select-listbox')).toBeInTheDocument();
  });

  test('calls onChange when a single option is selected', () => {
    const onChange = vi.fn();
    render(<Select options={options} value={value} onChange={onChange} />);
    const control = screen.getByTestId('select-trigger');
    fireEvent.click(control);
    fireEvent.click(screen.getByText('React'));
    expect(onChange).toHaveBeenCalledWith('react');
  });

  test('calls onChange with undefined when none option is selected', () => {
    const onChange = vi.fn();
    render(<Select options={options} value={value} onChange={onChange} />);
    const control = screen.getByTestId('select-trigger');
    fireEvent.click(control);
    fireEvent.click(screen.getByText('None'));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  test('calls onChange with array when multi option is selected', () => {
    const onChange = vi.fn();
    render(<Select options={options} value={['vue']} onChange={onChange} isMulti />);
    const control = screen.getByTestId('select-trigger');
    fireEvent.click(control);
    fireEvent.click(screen.getByText('React'));
    expect(onChange).toHaveBeenCalledWith(['vue', 'react']);
  });

  test('removes selected value when close button is clicked in multi select', () => {
    const onChange = vi.fn();
    render(<Select options={options} value={['vue', 'react']} onChange={onChange} isMulti />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove Vue' }));

    expect(onChange).toHaveBeenCalledWith(['react']);
  });
});
