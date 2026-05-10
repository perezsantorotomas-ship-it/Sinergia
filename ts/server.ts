import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for AI Insights
  app.get("/api/config/check", (req, res) => {
    res.json({
      geminiConfigured: !!process.env.GEMINI_API_KEY,
      openRouterConfigured: !!process.env.OPENROUTER_API_KEY
    });
  });

  // API Route for Sinergia AI Chat (using OpenRouter)
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { messages, userApiKey } = req.body;
      const apiKey = userApiKey || process.env.OPENROUTER_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "Sinergia AI key is not configured on the server." });
      }

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
          "X-Title": "Sinergia AI App",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openai/gpt-3.5-turbo", // Default model for OpenRouter
          messages: [
            {
              role: "system",
              content: "Eres el Asistente de Sinergia. Tu única función es ayudar a los usuarios con dudas sobre la plataforma Sinergia (matching industrial, red de contactos, etc.) y sus planes premium (Básico y Pro). NO respondas a ninguna pregunta que no esté relacionada con Sinergia. Si te preguntan por otros temas o planes de otras empresas, responde amablemente que solo tienes información sobre el ecosistema de Sinergia."
            },
            ...messages.map((m: any) => ({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.text
            }))
          ],
        })
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message || "OpenRouter error");
      }

      res.json({ text: data.choices[0].message.content });
    } catch (error: any) {
      console.error("Sinergia AI Chat Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate Sinergia AI response" });
    }
  });

  // API Route for sending verification codes via Mailjet
  app.post("/api/email/send-code", async (req, res) => {
    try {
      const { email, code } = req.body;
      const apiKey = process.env.MAILJET_API_KEY;
      const apiSecret = process.env.MAILJET_API_SECRET;

      if (!apiKey || !apiSecret) {
        // Fallback to success during development if keys are missing but log it
        console.warn("Mailjet API keys are missing. Email simulation mode active.");
        return res.json({ success: true, simulated: true });
      }

      const authHeader = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
      
      const response = await fetch("https://api.mailjet.com/v3.1/send", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${authHeader}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          Messages: [
            {
              From: {
                Email: "no-reply@sinergia.pro", // Should be a validated sender in Mailjet
                Name: "Sinergia Pro"
              },
              To: [
                {
                  Email: email,
                  Name: "Usuario Sinergia"
                }
              ],
              Subject: "Código de Verificación - Sinergia Pro",
              TextPart: `Tu código de seguridad para restablecer la contraseña es: ${code}`,
              HTMLPart: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px; margin: auto;">
                  <h2 style="color: #004d43; text-align: center;">Sinergia Pro</h2>
                  <p>Has solicitado restablecer tu contraseña. Utiliza el siguiente código de seguridad:</p>
                  <div style="background: #f3f6f9; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: 900; letter-spacing: 5px; color: #004d43;">${code}</span>
                  </div>
                  <p style="font-size: 12px; color: #666; text-align: center;">Este código caducará pronto. Si no has solicitado esto, ignora este mensaje.</p>
                </div>
              `
            }
          ]
        })
      });

      const data = await response.json();
      res.json({ success: true, data });
    } catch (error: any) {
      console.error("Mailjet Email Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GitHub OAuth Routes
  app.get("/api/auth/github/url", (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: "GITHUB_CLIENT_ID not configured" });
    }

    // Use origin from query if provided, otherwise fallback to APP_URL or localhost
    const clientOrigin = req.query.origin as string;
    const appUrl = clientOrigin || process.env.APP_URL || `http://localhost:${PORT}`;
    const redirectUri = `${appUrl.replace(/\/$/, "")}/api/auth/github/callback`;
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "user:email",
      state: Math.random().toString(36).substring(7)
    });

    res.json({ url: `https://github.com/login/oauth/authorize?${params}` });
  });

  app.get("/api/auth/github/callback", async (req, res) => {
    const { code } = req.query;
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!code || !clientId || !clientSecret) {
      return res.status(400).send("Missing code or GitHub configuration");
    }

    try {
      // 1. Exchange code for access token
      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code
        })
      });

      const tokenData = await tokenResponse.json();
      if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

      // 2. Get user info from GitHub
      const userResponse = await fetch("https://api.github.com/user", {
        headers: {
          "Authorization": `token ${tokenData.access_token}`
        }
      });
      const githubUser = await userResponse.json();

      // Send success message to parent window and close popup
      // We pass the github info so the client can use it to log in or link account
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS', 
                  payload: { 
                    provider: 'github',
                    githubId: '${githubUser.id}',
                    name: '${githubUser.name || githubUser.login}',
                    email: '${githubUser.email || ""}',
                    avatar: '${githubUser.avatar_url}'
                  } 
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Conexión con GitHub exitosa. Esta ventana se cerrará automáticamente.</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error("GitHub OAuth Callback Error:", error);
      res.status(500).send(`Error en la autenticación con GitHub: ${error.message}`);
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
