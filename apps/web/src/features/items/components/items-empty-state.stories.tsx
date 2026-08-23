import type { Meta, StoryObj } from '@storybook/tanstack-react';
import { Button } from '@/components/ui/button';
import { ItemsEmptyState } from './items-empty-state';

const meta = {
  title: 'Items/ItemsEmptyState',
  component: ItemsEmptyState,
} satisfies Meta<typeof ItemsEmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const EmptyRoom: Story = {
  args: {
    variant: 'empty-room',
    action: <Button variant="outline">Upload files</Button>,
  },
};

export const EmptyFolder: Story = {
  args: { variant: 'empty-folder' },
};

export const NoResults: Story = {
  args: {
    variant: 'no-results',
    action: <Button variant="outline">Clear search</Button>,
  },
};

/** A viewer is not invited to create anything — they cannot. */
export const ReadOnly: Story = {
  args: { variant: 'empty-folder', readOnly: true },
};
