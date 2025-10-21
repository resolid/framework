export const normalizeKey = (key: string): string => {
  const normalized = key.split("?")[0].replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "");

  if (!normalized) {
    throw new Error("Cache key cannot be empty after normalization");
  }

  return normalized;
};
