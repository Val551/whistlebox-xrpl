import type { Request, Response, NextFunction } from "express";

const readEnv = (name: string) => {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
};

const getActor = (req: Request) => req.header("x-actor-id")?.trim() ?? "unknown";

const audit = (req: Request, outcome: "deny_missing" | "deny_invalid" | "allow") => {
  const actor = getActor(req);
  const requestId =
    typeof req.body?.requestId === "string" && req.body.requestId.trim().length > 0
      ? req.body.requestId.trim()
      : "none";
  console.log(
    `[RELEASE_AUTH] outcome=${outcome} actor=${actor} path=${req.path} requestId=${requestId}`
  );
};

// Guards verifier-only release operations using a shared API token.
export const requireVerifierAuth = (req: Request, res: Response, next: NextFunction) => {
  const expectedToken = readEnv("VERIFIER_API_TOKEN");
  if (!expectedToken) {
    return res.status(500).json({
      error: "Server misconfigured: missing VERIFIER_API_TOKEN"
    });
  }

  const receivedToken = req.header("x-verifier-token")?.trim();
  if (!receivedToken) {
    audit(req, "deny_missing");
    return res.status(401).json({
      error: "Missing verifier auth token"
    });
  }

  if (receivedToken !== expectedToken) {
    audit(req, "deny_invalid");
    return res.status(403).json({
      error: "Invalid verifier auth token"
    });
  }

  audit(req, "allow");
  next();
};

