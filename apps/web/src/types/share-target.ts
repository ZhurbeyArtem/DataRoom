/**
 * What exactly the share dialog is opened for. The type lives in the shared
 * layer because the actions menu belongs to the items feature while the
 * dialog belongs to the shares feature, and direct imports between features
 * are forbidden.
 */
export interface ShareTarget {
  id: string;
  name: string;
  kind: 'room' | 'folder' | 'file';
}
