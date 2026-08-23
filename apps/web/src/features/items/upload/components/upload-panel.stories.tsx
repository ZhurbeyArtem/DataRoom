import type { Meta, StoryObj } from '@storybook/tanstack-react';
import type { UploadTask, UploadStatus } from '../upload.store';
import { UploadRow } from './upload-panel';

/**
 * The task is assembled by hand: a real one is only born inside the queue,
 * and we need all four of its states side by side.
 */
function task(status: UploadStatus, overrides: Partial<UploadTask> = {}): UploadTask {
  return {
    id: `task-${status}`,
    fileName: 'Office lease agreement 2026 (final revision).pdf',
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
  title: 'Upload/UploadRow',
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

/** On failure a retry button appears — the file need not be picked again. */
export const Failed: Story = {
  args: { task: task('error', { error: 'Storage rejected the file' }) },
};

export const Canceled: Story = {
  args: { task: task('canceled') },
};
