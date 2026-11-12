import '../app/styles/index.scss';
import '../shared/ui/modal/styles/styles.scss';
import '../shared/ui/select/styles/styles.scss';

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
