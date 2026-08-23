import type { Meta, StoryObj } from '@storybook/tanstack-react';
import { AccessDeniedScreen } from './access-denied-screen';

const meta = {
  title: 'Screens/AccessDeniedScreen',
  component: AccessDeniedScreen,
} satisfies Meta<typeof AccessDeniedScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A public visitor has nowhere to go back to — no button. */
export const Default: Story = {};

/** An owner does: back to the room they came from. */
export const WithBackButton: Story = {
  args: { onBack: () => {} },
};
