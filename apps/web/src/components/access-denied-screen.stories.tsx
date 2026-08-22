import type { Meta, StoryObj } from '@storybook/tanstack-react';
import { AccessDeniedScreen } from './access-denied-screen';

const meta = {
  title: 'Екрани/AccessDeniedScreen',
  component: AccessDeniedScreen,
} satisfies Meta<typeof AccessDeniedScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Публічному глядачеві повертатися нікуди — кнопки немає. */
export const Default: Story = {};

/** Власнику є куди: у кімнату, з якої він прийшов. */
export const WithBackButton: Story = {
  args: { onBack: () => {} },
};
