import React, { useState } from 'react';
import Select from '../components/select/Select';

const options = [
    { value: 'react', label: 'React' },
    { value: 'vue', label: 'Vue' },
    { value: 'angular', label: 'Angular' },
    { value: 'svelte', label: 'Svelte' },
    { value: 'solid', label: 'Solid' }
];

export default function SelectPage() {
    const [singleValue, setSingleValue] = useState<string | undefined>(undefined);
    const [multiValue, setMultiValue] = useState<string[]>([]);

    return (
        <div className="app">
            <h1>Select</h1>
            <Select
                options={options}
                value={singleValue}
                onChange={setSingleValue}
            />
            <h1>Multi Select</h1>
            <Select
                options={options}
                value={multiValue}
                onChange={setMultiValue}
                isMulti
            />
        </div>
    )
}
