export type Option = {
    value: string;
    label: string;
};

export type Props = {
    options: Option[];
    value?: string;
    onChange: (value: string) => void;
};