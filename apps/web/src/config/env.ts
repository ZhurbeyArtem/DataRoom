/**
 * The environment is read in one place and fails at startup if something is
 * missing. Otherwise an empty VITE_API_URL surfaces as a cryptic network
 * error in the middle of the app.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} is not set. Check apps/web/.env.local`);
  }
  return value;
}

export const env = {
  API_URL: required('VITE_API_URL', import.meta.env.VITE_API_URL as string | undefined),
} as const;
