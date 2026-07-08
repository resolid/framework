export function normalizeKey(key: string): string {
  const normalized = key
    .split("?")[0]
    ?.replaceAll(/[/\\]/g, ":")
    .replaceAll(/:+/g, ":")
    .replaceAll(/^:|:$/g, "");

  if (!normalized) {
    throw new Error("Cache key cannot be empty after normalization");
  }

  return normalized;
}
