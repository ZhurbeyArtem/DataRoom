import type { Meta, StoryObj } from '@storybook/tanstack-react';
import { FolderPlus } from 'lucide-react';
import { Button } from './button';

const meta = {
  title: 'UI/Button',
  component: Button,
  args: { children: 'Create' },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

/** All variants side by side: that is how drift between them shows up. */
export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2">
      <Button {...args} variant="default" />
      <Button {...args} variant="outline" />
      <Button {...args} variant="secondary" />
      <Button {...args} variant="ghost" />
      <Button {...args} variant="destructive" />
      <Button {...args} variant="link" />
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2">
      <Button {...args} size="xs" />
      <Button {...args} size="sm" />
      <Button {...args} size="default" />
      <Button {...args} size="lg" />
    </div>
  ),
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <FolderPlus />
        New folder
      </>
    ),
    variant: 'outline',
  },
};

/**
 * Request state. The button does not merely spin — it is disabled, so a
 * double click cannot create two folders.
 */
export const Loading: Story = {
  args: { loading: true, children: 'Creating…' },
};

export const Disabled: Story = {
  args: { disabled: true },
};
