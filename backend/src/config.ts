// Centralized runtime flags to control backend behavior (stub vs DB mode).
// Reads STUB_MODE from the environment and defaults to true for local dev.
export const STUB_MODE =
  (process.env.STUB_MODE ?? "true").toLowerCase() === "true";
