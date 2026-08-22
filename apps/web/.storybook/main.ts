import type { StorybookConfig } from '@storybook/tanstack-react';

/**
 * Story пишемо лише на спільні компоненти (`components/ui` і кілька екранних
 * станів). Story на цілі екрани вимагали б підняти роутер, сесію й моки API —
 * витрата, що в межах MVP нічого не доводить.
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: '@storybook/tanstack-react',
};

export default config;
