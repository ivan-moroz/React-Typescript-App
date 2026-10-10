import type {HTMLAttributes, Key, ReactNode, TableHTMLAttributes} from 'react';

export type TableColumn<T> = {
    key: string;
    header: ReactNode;
    render: (item: T) => ReactNode;
};

type TableProps<T> = Omit<TableHTMLAttributes<HTMLTableElement>, 'children'> & {
    columns: TableColumn<T>[];
    data: T[];
    getRowKey: (item: T) => Key;
    getRowProps?: (item: T) => HTMLAttributes<HTMLTableRowElement> & {'data-testid'?: string};
};

function Table<T>({columns, data, getRowKey, getRowProps, ...tableProps}: TableProps<T>) {
    return (
        <table {...tableProps}>
            <thead>
            <tr>
                {columns.map((column) => <th key={column.key}>{column.header}</th>)}
            </tr>
            </thead>
            <tbody>
            {data.map((item) => (
                <tr {...getRowProps?.(item)} key={getRowKey(item)}>
                    {columns.map((column) => <td key={column.key}>{column.render(item)}</td>)}
                </tr>
            ))}
            </tbody>
        </table>
    );
}

export default Table;
