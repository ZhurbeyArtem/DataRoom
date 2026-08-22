import type { Meta, StoryObj } from '@storybook/tanstack-react';
import { Button } from '@/components/ui/button';
import { ItemsEmptyState } from './items-empty-state';

const meta = {
  title: 'Елементи/ItemsEmptyState',
  component: ItemsEmptyState,
} satisfies Meta<typeof ItemsEmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const EmptyRoom: Story = {
  args: {
    variant: 'empty-room',
    action: <Button variant="outline">Завантажити файли</Button>,
  },
};

export const EmptyFolder: Story = {
  args: { variant: 'empty-folder' },
};

export const NoResults: Story = {
  args: {
    variant: 'no-results',
    action: <Button variant="outline">Очистити пошук</Button>,
  },
};

/** Глядачеві не пропонуємо створювати — він цього не може. */
export const ReadOnly: Story = {
  args: { variant: 'empty-folder', readOnly: true },
};
