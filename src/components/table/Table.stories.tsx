import type {Meta, StoryObj} from '@storybook/react-vite';
import Table, {type TableColumn} from './Table';

type Person = {
    id: number;
    name: string;
    email: string;
};

const data: Person[] = [
    {id: 1, name: 'Alex Morgan', email: 'alex@example.com'},
    {id: 2, name: 'Sam Rivera', email: 'sam@example.com'},
    {id: 3, name: 'Jamie Chen', email: 'jamie@example.com'},
];

const columns: TableColumn<Person>[] = [
    {key: 'id', header: 'ID', render: (person) => person.id},
    {key: 'name', header: 'Name', render: (person) => person.name},
    {key: 'email', header: 'Email', render: (person) => person.email},
];

const meta = {
    title: 'Components/Table',
    component: Table<Person>,
    args: {
        columns,
        data,
        getRowKey: (person) => person.id,
        border: 1,
        cellPadding: 8,
        style: {borderCollapse: 'collapse', width: '100%'},
    },
    argTypes: {
        columns: {control: false},
        getRowKey: {control: false},
        getRowProps: {control: false},
    },
} satisfies Meta<typeof Table<Person>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
    args: {data: []},
};

export const CustomCells: Story = {
    args: {
        columns: [
            ...columns.slice(0, 2),
            {
                key: 'contact',
                header: 'Contact',
                render: (person) => <a href={`mailto:${person.email}`}>{person.email}</a>,
            },
        ],
    },
};

export const CustomRows: Story = {
    args: {
        getRowProps: (person) => ({
            style: {backgroundColor: person.id % 2 === 0 ? '#f0f4f8' : undefined},
        }),
    },
};
