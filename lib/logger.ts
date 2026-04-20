export function logError(context: string, err: unknown, extra?: Record<string, unknown>): void {
  if (__DEV__) {
    if (extra) {
      console.error(`[${context}]`, err, extra);
    } else {
      console.error(`[${context}]`, err);
    }
  }
}

export function logInfo(context: string, message: string, data?: unknown): void {
  if (__DEV__) {
    if (data !== undefined) {
      console.log(`[${context}]`, message, data);
    } else {
      console.log(`[${context}]`, message);
    }
  }
}
