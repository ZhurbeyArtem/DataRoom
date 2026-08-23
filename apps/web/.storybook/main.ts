import type { StorybookConfig } from '@storybook/tanstack-react';

/**
 * Stories are written for shared components only (`components/ui` plus a few
 * screen states). Stories for whole screens would need a router, a session
 * and API mocks — an expense that proves nothing within an MVP.
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: '@storybook/tanstack-react',
};

export default config;
