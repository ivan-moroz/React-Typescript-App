import React, { useEffect, useRef, useState } from 'react';
import './styles/styles.css';
import {Option, Props} from './types/types';

export default function CustomSelect({ options, value, onChange, isMulti = false }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);

    const selectedValues = isMulti && Array.isArray(value) ? value : [];
    const selectedOption = !isMulti && typeof value === 'string'
        ? options.find(opt => opt.value === value)
        : undefined;

    const displayLabel = isMulti
        ? options
            .filter(opt => selectedValues.includes(opt.value))
            .map(opt => opt.label)
            .join(', ') || 'Select options'
        : selectedOption?.label ?? 'Select option';

    const isOptionSelected = (optionValue: string): boolean => {
        if (isMulti) {
            return selectedValues.includes(optionValue);
        }

        return optionValue === value;
    };

    const applySelection = (optionValue: string): void => {
        if (isMulti) {
            const nextValues = selectedValues.includes(optionValue)
                ? selectedValues.filter((selectedValue) => selectedValue !== optionValue)
                : [...selectedValues, optionValue];

            (onChange as (value: string[]) => void)(nextValues);
            return;
        }

        (onChange as (value: string) => void)(optionValue);
        setIsOpen(false);
    };

    /* ===== Close on outside click ===== */
    useEffect(() => {
        const handler = (e: MouseEvent):void => {
            if (!containerRef.current?.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    /* ===== Keyboard support ===== */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>):void => {
        if (!isOpen && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(true);
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(i => (i + 1) % options.length);
                break;

            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(i =>
                    i === 0 ? options.length - 1 : i - 1
                );
                break;

            case 'Enter':
                e.preventDefault();
                applySelection(options[highlightedIndex].value);
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
                    data-testid='select-trigger'
                    className="select-value"
                    onClick={() => setIsOpen(prev => !prev)}
                >
                    <span className="select-label">{displayLabel}</span>
                    <span className={`material-icons select-arrow ${isOpen ? 'open' : ''}`}>keyboard_arrow_down</span>
                </div>

                {isOpen && (
                    <ul data-testid='select-listbox' className="select-options" role="listbox">
                        {options.map((option: Option, index: number) => (
                            <li
                                key={option.value}
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
