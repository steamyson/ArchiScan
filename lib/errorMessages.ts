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
    if (msg.includes("not signed in")) {
      return "Sign in to run analysis on your photos.";
    }
    if (msg.includes("unauthorized") || msg.includes("401") || msg.includes("invalid jwt") || msg.includes("jwt expired")) {
      return "Your session has expired. Please sign in again.";
    }
    if (msg.includes("storage") || msg.includes("upload")) {
      return "Could not upload the photo. Try again.";
    }
    if (msg.includes("server misconfigured")) {
      return "Analysis isn't set up on the server yet (missing API keys or secrets).";
    }
    if (msg.includes("image download failed")) {
      return "The photo uploaded but the server could not load it. Try again.";
    }
    if (msg.includes("503") || msg.includes("unavailable") || msg.includes("high demand")) {
      return "The AI is a bit busy right now. Wait a few seconds and try again.";
    }
    if (msg.includes("gemini api error") || msg.includes("gemini")) {
      return "The AI service returned an error. Try again in a moment.";
    }
    if (msg.includes("insert failed") || msg.includes("rpc")) {
      return "Could not save the scan. The database may need an update.";
    }
    if (msg.includes("edge function")) {
      return "Analysis failed. Try again.";
    }
    if (msg.includes("functionsrelayerror") || msg.includes("non-2xx")) {
      return "Analysis failed. Try again.";
    }
  }

  return "Something went wrong. Try again.";
}
