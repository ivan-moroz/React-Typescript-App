import {useEffect, useState} from 'react';
import type {Meta, StoryObj} from '@storybook/react-vite';
import Select from './Select';
import type {Props} from './types/types';

const options = [
    {value: 'react', label: 'React'},
    {value: 'vue', label: 'Vue'},
    {value: 'angular', label: 'Angular'},
    {value: 'svelte', label: 'Svelte'},
    {value: 'solid', label: 'Solid'},
];

function SelectExample(args: Props) {
    const [value, setValue] = useState(args.value);

    useEffect(() => {
        setValue(args.value);
    }, [args.value, args.isMulti]);

    return (
        <div style={{width: 320, minHeight: 320}}>
            {args.isMulti ? (
                <Select
                    {...args}
                    value={Array.isArray(value) ? value : []}
                    onChange={(nextValue: string[]) => {
                        setValue(nextValue);
                        args.onChange(nextValue);
                    }}
                />
            ) : (
                <Select
                    {...args}
                    value={typeof value === 'string' ? value : undefined}
                    onChange={(nextValue: string | undefined) => {
                        setValue(nextValue);
                        args.onChange(nextValue);
                    }}
                />
            )}
        </div>
    );
}

const meta = {
    title: 'Components/Select',
    component: Select,
    args: {options, onChange: () => {}},
    render: (args) => <SelectExample {...args} />,
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {
    args: {isMulti: false},
};

export const SingleSelected: Story = {
    args: {isMulti: false, value: 'vue'},
};

export const Multiple: Story = {
    args: {isMulti: true, value: []},
};

export const MultipleSelected: Story = {
    args: {isMulti: true, value: ['react', 'vue']},
};

export const EmptyOptions: Story = {
    args: {isMulti: false, options: []},
};
