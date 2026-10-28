import '../src/styles/index.scss';
import '../src/components/modal/styles/styles.scss';
import '../src/components/select/styles/styles.scss';

import type {Preview} from '@storybook/react-vite';

const preview: Preview = {
    parameters: {
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
    },
};

export default preview;
