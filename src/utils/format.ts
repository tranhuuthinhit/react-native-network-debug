const pad = (num: number) => `0${num}`.slice(-2);

/** `13:30:39` — the format used in row meta, stat cards and the status line. */
export const formatTime = (time: number) => {
  if (!time) return '';
  const date = new Date(time);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}`;
};

/**
 * Durations read as `640ms` below a second and `4.26s` above it, which
 * is how the mocks show both the row meta and the DURATION stat card.
 */
export const formatDuration = (ms: number) => {
  if (ms < 0 || !Number.isFinite(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

/** Always milliseconds — used for the per-phase timing rows. */
export const formatMs = (ms: number) => `${Math.round(ms)}ms`;

export const formatBytes = (bytes: number) => {
  if (!bytes || bytes < 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const pluralise = (count: number, singular: string, plural?: string) =>
  `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;

/**
 * Time-group headers cluster rows that started in the same minute.
 * Returns `13:30` for a timestamp, or `''` when the time is unknown.
 */
export const timeGroupKey = (time: number) => {
  if (!time) return '';
  const date = new Date(time);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
