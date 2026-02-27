export type Option = {
    value: string;
    label: string;
};

type BaseProps = {
    options: Option[];
};

type SingleSelectProps = BaseProps & {
    value?: string;
    onChange: (value: string) => void;
    multiple?: false;
};

type MultiSelectProps = BaseProps & {
    value?: string[];
    onChange: (value: string[]) => void;
    multiple: true;
};

export type Props = SingleSelectProps | MultiSelectProps;
