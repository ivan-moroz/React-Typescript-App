import React, { useEffect, useRef, useState } from 'react';
import './styles/styles.css';
import {Option, Props} from './types/types';


export default function CustomSelect({ options, value, onChange }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

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
                onChange(options[highlightedIndex].value);
                setIsOpen(false);
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
                    onClick={() => setIsOpen(prev => !prev)}
                >
                    {selectedOption?.label ?? 'Select option'}
                </div>

                {isOpen && (
                    <ul data-testid='select-listbox' className="select-options" role="listbox">
                        {options.map((option: Option, index: number) => (
                            <li
                                key={option.value}
                                role="option"
                                aria-selected={option.value === value}
                                className={`option ${
                                    index === highlightedIndex ? 'highlighted' : ''
                                }`}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
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
