import { Router, Request, Response } from "express";
import admin from "firebase-admin";
import { firebaseAdmin } from "../config/firebaseAdmin";

const router = Router();
const db = firebaseAdmin.firestore();

/**
 * [NV-08] POST /api/csp-report
 * Parse and log CSP violations, trigger admin alerts on script-src violations.
 */
router.post("/csp-report", async (req: Request, res: Response) => {
  const report = req.body["csp-report"];
  if (!report) {
    return res.status(400).json({ error: "Invalid CSP report" });
  }

  const violatedDirective = String(report["violated-directive"] || report["effective-directive"] || "");
  const isScriptSrc = violatedDirective.includes("script-src");

  try {
    const eventRef = await db.collection("security_events").add({
      type: "csp_violation",
      report,
      violatedDirective,
      isScriptSrc,
      userAgent: req.headers["user-agent"] || "unknown",
      ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (isScriptSrc) {
      // Send alert email to admins
      const adminsSnapshot = await db.collection("users").where("role", "==", "admin").get();
      const adminEmails = adminsSnapshot.docs.map(doc => doc.data().email).filter(Boolean);
      
      const recipientEmails = [...new Set([...adminEmails, "security@sharevibe.co"])];
      
      for (const email of recipientEmails) {
        await db.collection("mail").add({
          to: email,
          message: {
            subject: "GÜVENLİK UYARISI: CSP Script-Src İhlali",
            text: `ShareVibe üzerinde bir CSP script-src ihlali engellendi.\n\nDoküman: ${report["document-uri"]}\nEngellenen URI: ${report["blocked-uri"]}\nDirektif: ${violatedDirective}\nOlay ID: ${eventRef.id}`,
            html: `<p>Bir İçerik Güvenlik Politikası (CSP) script-src ihlali engellenmiş ve kaydedilmiştir.</p>
                   <p><strong>Doküman:</strong> ${report["document-uri"]}</p>
                   <p><strong>Engellenen URI:</strong> ${report["blocked-uri"]}</p>
                   <p><strong>Direktif:</strong> ${violatedDirective}</p>
                   <p><strong>Olay ID:</strong> ${eventRef.id}</p>`
          }
        });
      }
    }

    return res.json({ status: "success" });
  } catch (error) {
    console.error("Failed to log CSP report:", error);
    return res.status(500).json({ error: "Internal error" });
  }
});

export default router;
