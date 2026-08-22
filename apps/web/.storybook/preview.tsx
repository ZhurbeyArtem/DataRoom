import type { Preview } from '@storybook/tanstack-react';
// Той самий css, що й у застосунку: без нього компоненти рендеряться
// без токенів теми і Storybook показує не те, що бачить користувач.
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
