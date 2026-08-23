import type { Preview } from '@storybook/tanstack-react';
// The same css the app uses: without it components render without theme
// tokens and Storybook shows something the user never sees.
import '../src/index.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: { test: 'todo' },
  },
};

export default preview;
