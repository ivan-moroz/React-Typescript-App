export type Option = {
    value: string;
    label: string;
};

type BaseProps = {
    options: Option[];
};

export type SingleSelectProps = BaseProps & {
    isMulti?: false;
    value?: string;
    onChange: (value: string) => void;
};

export type MultiSelectProps = BaseProps & {
    isMulti: true;
    value?: string[];
    onChange: (value: string[]) => void;
};

export type Props = SingleSelectProps | MultiSelectProps;
