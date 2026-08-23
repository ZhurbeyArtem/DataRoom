import type { Meta, StoryObj } from '@storybook/tanstack-react';
import { ItemBreadcrumbs } from './item-breadcrumbs';

const crumb = (name: string) => ({ id: name, name });

const meta = {
  title: 'Items/ItemBreadcrumbs',
  component: ItemBreadcrumbs,
  args: { roomId: 'room-1', roomName: 'Due Diligence 2026' },
} satisfies Meta<typeof ItemBreadcrumbs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Room root: the room name itself is the current page. */
export const RoomRoot: Story = {
  args: { trail: [] },
};

export const OneLevel: Story = {
  args: { trail: [crumb('Room')], current: 'Finance' },
};

/** A long path: checks that the chain wraps instead of breaking the layout. */
export const LongPath: Story = {
  args: {
    trail: [
      crumb('Room'),
      crumb('Finance'),
      crumb('Reporting'),
      crumb('2026'),
      crumb('Q1'),
    ],
    current: 'Auditor opinions',
  },
};

/** A public viewer does not know the room name — no first crumb. */
export const PublicViewer: Story = {
  args: {
    roomName: undefined,
    readOnly: true,
    shareToken: 'token',
    trail: [crumb('Shared folder')],
    current: 'Contracts',
  },
};
