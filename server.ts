import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for sending invitations
  app.post("/api/send-invitations", async (req, res) => {
    const { subject, roomName, startTime, endTime, organizerName, participants } = req.body;

    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY is missing.");
      return res.status(400).json({ 
        success: false, 
        error: "Configuration manquante (RESEND_API_KEY). Veuillez configurer la clé API dans les réglages." 
      });
    }

    try {
      const results = await Promise.all(participants.map(async (p: { name: string, email: string }) => {
        return resend.emails.send({
          from: 'Thalès Room Connect <onboarding@resend.dev>',
          to: p.email,
          subject: `Invitation : ${subject}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #001D40;">Nouvelle invitation de réunion</h2>
              <p>Bonjour <strong>${p.name}</strong>,</p>
              <p><strong>${organizerName}</strong> vous a invité à une réunion.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p><strong>Sujet :</strong> ${subject}</p>
              <p><strong>Salle :</strong> ${roomName}</p>
              <p><strong>Date/Heure :</strong> ${new Date(startTime).toLocaleString('fr-FR')}</p>
              <p><strong>Fin prévue :</strong> ${new Date(endTime).toLocaleTimeString('fr-FR')}</p>
              <br />
              <p style="font-size: 12px; color: #666;">Ceci est un mail automatique envoyé via Thalès Room Connect.</p>
            </div>
          `
        });
      }));

      // Check for errors in Resend responses
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error("Resend API Errors:", errors);
        return res.status(500).json({ 
          success: false, 
          error: "Certains emails n'ont pas pu être envoyés. Vérifiez si vous êtes en mode Sandbox (limité à votre propre email)." 
        });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Critical error sending emails:", error);
      res.status(500).json({ success: false, error: error.message || "Erreur interne lors de l'envoi des invitations." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
