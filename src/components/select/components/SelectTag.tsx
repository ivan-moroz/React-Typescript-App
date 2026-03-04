import React from 'react';
import {SelectTagProps} from '../types/types';

export default function SelectTag({ label, onRemove }: SelectTagProps) {
    return (
        <span className="select-tag">
            <span>{label}</span>
            <button
                type="button"
                className="select-tag-remove"
                aria-label={`Remove ${label}`}
                onClick={(event) => {
                    event.stopPropagation();
                    onRemove();
                }}
            >
                <span className="material-icons">close</span>
            </button>
        </span>
    );
}
