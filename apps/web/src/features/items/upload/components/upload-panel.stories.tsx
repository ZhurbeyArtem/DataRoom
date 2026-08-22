import type { Meta, StoryObj } from '@storybook/tanstack-react';
import type { UploadTask, UploadStatus } from '../upload.store';
import { UploadRow } from './upload-panel';

/**
 * Завдання складаємо вручну: справжнє народжується лише всередині черги,
 * а нам потрібні всі чотири його стани поруч.
 */
function task(status: UploadStatus, overrides: Partial<UploadTask> = {}): UploadTask {
  return {
    id: `task-${status}`,
    fileName: 'Договір оренди приміщення 2026 (фінальна редакція).pdf',
    size: 2_400_000,
    progress: 0,
    status,
    parentId: 'parent',
    scopeId: 'scope',
    file: new File([], 'file.pdf'),
    controller: new AbortController(),
    ...overrides,
  };
}

const meta = {
  title: 'Аплоад/UploadRow',
  component: UploadRow,
  decorators: [
    (Story) => (
      <div className="w-[22rem] overflow-hidden rounded-xl border bg-popover">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof UploadRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Queued: Story = {
  args: { task: task('queued') },
};

export const Uploading: Story = {
  args: { task: task('uploading', { progress: 0.42 }) },
};

export const Done: Story = {
  args: { task: task('done', { progress: 1 }) },
};

/** З помилкою зʼявляється кнопка повтору — файл не треба вибирати заново. */
export const Failed: Story = {
  args: { task: task('error', { error: 'Сховище не прийняло файл' }) },
};

export const Canceled: Story = {
  args: { task: task('canceled') },
};
