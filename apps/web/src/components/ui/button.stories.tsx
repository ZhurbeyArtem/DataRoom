import type { Meta, StoryObj } from '@storybook/tanstack-react';
import { FolderPlus } from 'lucide-react';
import { Button } from './button';

const meta = {
  title: 'UI/Button',
  component: Button,
  args: { children: 'Створити' },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Усі варіанти поруч: саме так видно, що вони не розʼїхались між собою. */
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
        Нова папка
      </>
    ),
    variant: 'outline',
  },
};

/**
 * Стан запиту. Кнопка не просто крутить спінер — вона заблокована, тому
 * подвійний клік не створює дві папки.
 */
export const Loading: Story = {
  args: { loading: true, children: 'Створюємо…' },
};

export const Disabled: Story = {
  args: { disabled: true },
};
