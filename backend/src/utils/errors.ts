import { Response } from "express";

export const getPublicErrorMessage = (fallback: string, error: unknown) => {
  if (process.env.NODE_ENV === "production") {
    return fallback;
  }

  const detail = error instanceof Error ? error.message : String(error);
  return detail ? `${fallback}: ${detail}` : fallback;
};

export const sendSafeError = (
  res: Response,
  error: unknown,
  fallback: string,
  status = 500
) => res.status(status).json({ error: getPublicErrorMessage(fallback, error) });

export const logServerError = (message: string, error: unknown) => {
  if (process.env.NODE_ENV === "production") {
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code?: unknown }).code
        : "internal_error";
    console.error(message, { code });
    return;
  }

  console.error(message, error);
};
