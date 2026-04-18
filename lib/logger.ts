export function logError(context: string, err: unknown): void {
  if (__DEV__) {
    console.error(`[${context}]`, err);
  }
}
