export function logMetric(
  name: string,
  value: number,
  tags: Record<string, string | number | boolean> = {},
): void {
  if (__DEV__) {
    console.log(`[METRIC] ${name}=${value}`, tags);
  }
  // Future: forward to Sentry / metrics backend (M7).
}
