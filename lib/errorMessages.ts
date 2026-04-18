import { NotAFacadeError } from "./analysis";

export function getUserFriendlyMessage(err: unknown): string {
  if (err instanceof NotAFacadeError) {
    return err.message;
  }

  if (err instanceof Error) {
    const msg = err.message.toLowerCase();

    if (msg.includes("network") || msg.includes("fetch")) {
      return "Check your connection and try again.";
    }
    if (msg.includes("timeout")) {
      return "The request took too long. Try again.";
    }
    if (msg.includes("unauthorized") || msg.includes("401")) {
      return "Your session has expired. Please sign in again.";
    }
    if (msg.includes("storage") || msg.includes("upload")) {
      return "Could not upload the photo. Try again.";
    }
    if (msg.includes("gemini") || msg.includes("edge function")) {
      return "Analysis failed. Try again.";
    }
    if (msg.includes("functionsrelayerror") || msg.includes("non-2xx")) {
      return "Analysis failed. Try again.";
    }
  }

  return "Something went wrong. Try again.";
}
