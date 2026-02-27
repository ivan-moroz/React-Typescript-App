import React, { useEffect, useRef, useState } from 'react';
import './styles/styles.css';
import { Option, Props } from './types/types';

export default function CustomSelect({ options, value, onChange, multiple = false }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);

    const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
    const selectedOptions = options.filter((option) => selectedValues.includes(option.value));

    const handleSelect = (optionValue: string): void => {
        if (multiple) {
            const hasValue = selectedValues.includes(optionValue);
            const nextValue = hasValue
                ? selectedValues.filter((item) => item !== optionValue)
                : [...selectedValues, optionValue];

            (onChange as (value: string[]) => void)(nextValue);
            return;
        }

        (onChange as (value: string) => void)(optionValue);
        setIsOpen(false);
    };

    /* ===== Close on outside click ===== */
    useEffect(() => {
        const handler = (e: MouseEvent): void => {
            if (!containerRef.current?.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    /* ===== Keyboard support ===== */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
        if (!isOpen && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(true);
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex((i) => (i + 1) % options.length);
                break;

            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex((i) =>
                    i === 0 ? options.length - 1 : i - 1
                );
                break;

            case 'Enter':
                e.preventDefault();
                handleSelect(options[highlightedIndex].value);
                break;

            case 'Escape':
                setIsOpen(false);
                break;
        }
    };

    return (
        <>
            <h1>Select</h1>
            <div
                ref={containerRef}
                tabIndex={0}
                className="select"
                onKeyDown={handleKeyDown}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <div
                    data-testid='select-trigger'
                    className="select-value"
                    onClick={() => setIsOpen((prev) => !prev)}
                >
                    {selectedOptions.length > 0
                        ? selectedOptions.map((option) => option.label).join(', ')
                        : 'Select option'}
                </div>

                {isOpen && (
                    <ul data-testid='select-listbox' className="select-options" role="listbox" aria-multiselectable={multiple}>
                        {options.map((option: Option, index: number) => (
                            <li
                                key={option.value}
                                role="option"
                                aria-selected={selectedValues.includes(option.value)}
                                className={`option ${
                                    index === highlightedIndex ? 'highlighted' : ''
                                } ${selectedValues.includes(option.value) ? 'selected' : ''}`}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                onClick={() => {
                                    handleSelect(option.value);
                                }}
                            >
                                {option.label}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
}
