import type { Response } from "express";

type ErrorExtras = Record<string, unknown>;

// Shared error helpers to keep response shapes and status codes consistent.

// Returns a 400 response for invalid input or missing required fields.
export const badRequest = (
  res: Response,
  message: string,
  extras?: ErrorExtras
) => res.status(400).json({ error: message, ...(extras ?? {}) });

// Returns a 404 response when a requested resource is not found.
export const notFound = (
  res: Response,
  message: string,
  extras?: ErrorExtras
) => res.status(404).json({ error: message, ...(extras ?? {}) });

// Returns a 409 response for duplicate or invalid state transitions.
export const conflict = (
  res: Response,
  message: string,
  extras?: ErrorExtras
) => res.status(409).json({ error: message, ...(extras ?? {}) });
