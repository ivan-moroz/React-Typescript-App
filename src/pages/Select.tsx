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
    const [value, setValue] = useState('');

    return (
        <div className="app">
            <Select
                options={options}
                value={value}
                onChange={setValue}
            />
        </div>
    )
}