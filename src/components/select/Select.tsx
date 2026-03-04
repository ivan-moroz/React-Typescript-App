import React, { useEffect, useRef, useState } from 'react';
import './styles/styles.scss';
import { Option, Props, SingleSelectOption } from './types/types';
import SelectTag from './components/SelectTag';

export default function CustomSelect({ options, value, onChange, isMulti = false }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);

    const selectedValues = isMulti && Array.isArray(value) ? value : [];
    const selectedOption = !isMulti && typeof value === 'string'
        ? options.find(opt => opt.value === value)
        : undefined;

    const selectedOptions = options.filter((option) => selectedValues.includes(option.value));
    const singleSelectOptions: SingleSelectOption[] = [{ value: undefined, label: 'None' }, ...options];
    const visibleOptions: (Option | SingleSelectOption)[] = isMulti ? options : singleSelectOptions;

    const displayLabel = selectedOption?.label ?? 'Select option';

    const isOptionSelected = (optionValue?: string): boolean => {
        if (isMulti) {
            return Boolean(optionValue) && selectedValues.includes(optionValue);
        }

        return optionValue === value;
    };

    const applySelection = (optionValue?: string): void => {
        if (isMulti) {
            if (!optionValue) {
                return;
            }

            const nextValues = selectedValues.includes(optionValue)
                ? selectedValues.filter((selectedValue) => selectedValue !== optionValue)
                : [...selectedValues, optionValue];

            (onChange as (value: string[]) => void)(nextValues);
            return;
        }

        (onChange as (value: string | undefined) => void)(optionValue);
        setIsOpen(false);
    };

    const removeSelectedOption = (optionValue: string): void => {
        if (!isMulti) {
            return;
        }

        const nextValues = selectedValues.filter((selectedValue) => selectedValue !== optionValue);
        (onChange as (value: string[]) => void)(nextValues);
    };

    useEffect(() => {
        const handler = (e: MouseEvent): void => {
            if (!containerRef.current?.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
        if (!isOpen && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(true);
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(i => (i + 1) % visibleOptions.length);
                break;

            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(i =>
                    i === 0 ? visibleOptions.length - 1 : i - 1,
                );
                break;

            case 'Enter':
                e.preventDefault();
                applySelection(visibleOptions[highlightedIndex].value);
                break;

            case 'Escape':
                setIsOpen(false);
                break;
        }
    };

    return (
        <>
            <div
                ref={containerRef}
                tabIndex={0}
                className="select"
                onKeyDown={handleKeyDown}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <div
                    data-testid="select-trigger"
                    className="select-value"
                    onClick={() => setIsOpen(prev => !prev)}
                >
                    {isMulti ? (
                        <span className="select-multi-values">
                            {selectedOptions.length === 0 ? (
                                <span className="select-label">Select options</span>
                            ) : (
                                selectedOptions.map((option) => (
                                    <SelectTag
                                        key={option.value}
                                        label={option.label}
                                        onRemove={() => removeSelectedOption(option.value)}
                                    />
                                ))
                            )}
                        </span>
                    ) : (
                        <span className="select-label">{displayLabel}</span>
                    )}
                    <span className={`material-icons select-arrow ${isOpen ? 'open' : ''}`}>keyboard_arrow_down</span>
                </div>

                {isOpen && (
                    <ul data-testid="select-listbox" className="select-options" role="listbox">
                        {visibleOptions.map((option, index: number) => (
                            <li
                                key={option.value ?? 'none'}
                                role="option"
                                aria-selected={isOptionSelected(option.value)}
                                className={`option ${
                                    isOptionSelected(option.value) ? 'selected' : ''
                                } ${
                                    index === highlightedIndex ? 'highlighted' : ''
                                }`}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                onClick={() => {
                                    applySelection(option.value);
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
