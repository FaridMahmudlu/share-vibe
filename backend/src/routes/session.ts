import { Router, Request, Response } from "express";
import { firebaseAuth } from "../config/firebaseAdmin";
import { logServerError } from "../utils/errors";

const router = Router();

const getCookieValue = (cookieHeader: string | undefined, name: string): string | null => {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
};

/**
 * [NV-02] POST /api/session/login
 * Create a session cookie for the authenticated user
 */
router.post("/session/login", async (req: Request, res: Response) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({ error: "idToken is required" });
  }

  try {
    // Session cookie valid for 5 days
    const expiresIn = 5 * 24 * 60 * 60 * 1000;
    const sessionCookie = await firebaseAuth.createSessionCookie(idToken, { expiresIn });

    // __Host- cookie attributes: HttpOnly, Secure, SameSite=Strict, Path=/
    res.setHeader(
      "Set-Cookie",
      `__Host-session=${sessionCookie}; Path=/; Max-Age=432000; Secure; HttpOnly; SameSite=Strict`
    );

    return res.json({ status: "success" });
  } catch (error) {
    logServerError("Failed to create session cookie:", error);
    return res.status(401).json({ error: "Unauthorized" });
  }
});

/**
 * [NV-02] POST /api/session/logout
 * Revoke tokens and clear the session cookie
 */
router.post("/session/logout", async (req: Request, res: Response) => {
  const cookie = getCookieValue(req.headers.cookie, "__Host-session");

  if (cookie) {
    try {
      const decodedClaims = await firebaseAuth.verifySessionCookie(cookie);
      await firebaseAuth.revokeRefreshTokens(decodedClaims.uid);
    } catch (error) {
      logServerError("Error revoking tokens on logout:", error);
    }
  }

  // Clear cookie
  res.setHeader(
    "Set-Cookie",
    "__Host-session=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict"
  );

  return res.json({ status: "success" });
});

/**
 * [NV-02] GET /api/session/check
 * Verify session cookie and return custom token for in-memory auth re-auth
 */
router.get("/session/check", async (req: Request, res: Response) => {
  const cookie = getCookieValue(req.headers.cookie, "__Host-session");

  if (!cookie) {
    return res.json({ customToken: null });
  }

  try {
    // Verify session cookie, check revocation
    const decodedClaims = await firebaseAuth.verifySessionCookie(cookie, true);
    
    // Generate custom token for client SDK sign-in (in-memory state replenishment)
    const customToken = await firebaseAuth.createCustomToken(decodedClaims.uid);

    return res.json({
      customToken,
      email: decodedClaims.email || null,
      uid: decodedClaims.uid,
    });
  } catch (error) {
    // Clear invalid/expired cookie
    res.setHeader(
      "Set-Cookie",
      "__Host-session=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict"
    );
    return res.json({ customToken: null });
  }
});

export default router;
