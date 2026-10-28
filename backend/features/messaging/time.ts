// A deterministic timezone prevents server/browser hydration differences.
export function messageTime(value: string, includeDate = false): string {
  const iso = new Date(value).toISOString();
  return `${includeDate ? `${iso.slice(0, 10)} ` : ""}${iso.slice(11, 16)} UTC`;
}
