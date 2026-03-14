/**
 * Safely coerce an Express route param (string | string[]) to string.
 * Express 5 types params as string | string[]; in practice route params are always strings.
 */
export const p = (value: string | string[]): string =>
  Array.isArray(value) ? value[0] : value;
