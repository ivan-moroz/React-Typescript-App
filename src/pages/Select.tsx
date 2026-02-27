import { useState } from 'react';
import Select from '../components/select/Select';

const options = [
    { value: 'react', label: 'React' },
    { value: 'vue', label: 'Vue' },
    { value: 'angular', label: 'Angular' },
    { value: 'svelte', label: 'Svelte' },
    { value: 'solid', label: 'Solid' }
];

export default function SelectPage() {
    const [singleValue, setSingleValue] = useState('');
    const [multiValue, setMultiValue] = useState<string[]>([]);

    return (
        <div className="app">
            <Select
                options={options}
                value={singleValue}
                onChange={setSingleValue}
            />

            <Select
                options={options}
                value={multiValue}
                onChange={setMultiValue}
                isMulti
            />
        </div>
    )
}
