import '../backend/app/styles/index.scss';
import '../backend/features/shared/modal/styles/styles.scss';
import '../backend/features/shared/select/styles/styles.scss';

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
