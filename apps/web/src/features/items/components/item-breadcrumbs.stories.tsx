import type { Meta, StoryObj } from '@storybook/tanstack-react';
import { ItemBreadcrumbs } from './item-breadcrumbs';

const crumb = (name: string) => ({ id: name, name });

const meta = {
  title: 'Елементи/ItemBreadcrumbs',
  component: ItemBreadcrumbs,
  args: { roomId: 'room-1', roomName: 'Due Diligence 2026' },
} satisfies Meta<typeof ItemBreadcrumbs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Корінь кімнати: сама назва кімнати і є поточною сторінкою. */
export const RoomRoot: Story = {
  args: { trail: [] },
};

export const OneLevel: Story = {
  args: { trail: [crumb('Кімната')], current: 'Фінанси' },
};

/** Довгий шлях: перевіряємо, що ланцюжок переноситься, а не ламає верстку. */
export const LongPath: Story = {
  args: {
    trail: [
      crumb('Кімната'),
      crumb('Фінанси'),
      crumb('Звітність'),
      crumb('2026'),
      crumb('Квартал 1'),
    ],
    current: 'Аудиторські висновки',
  },
};

/** Публічний глядач назви кімнати не знає — першої крихти немає. */
export const PublicViewer: Story = {
  args: {
    roomName: undefined,
    readOnly: true,
    shareToken: 'token',
    trail: [crumb('Спільна папка')],
    current: 'Договори',
  },
};
