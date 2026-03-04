import React from 'react';

type Props = {
    label: string;
    onRemove: () => void;
};

export default function SelectTag({ label, onRemove }: Props) {
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
