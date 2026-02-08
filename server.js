import express from "express";
import { WebSocketServer } from "ws";
import OpenAI from "openai";
import http from "http";

const app = express();
const server = http.createServer(app);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const wss = new WebSocketServer({ server, path: "/media" });

wss.on("connection", async (twilioSocket) => {

  console.log("Twilio connected");

  const openaiSocket = await openai.beta.realtime.connect({
    model: "gpt-4o-realtime-preview"
  });

  // 🎯 Configuration voix naturelle + rôle agent
  openaiSocket.send({
  type: "session.update",
  session: {
    instructions: `
Tu es l’agent téléphonique officiel de O'Sezam Pizza.

Ton ton :
- Voix calme, posée, chaleureuse et professionnelle.
- Discours clair, fluide, naturel.
- Commercial sans être insistant.
- Parle comme un responsable de restaurant attentif à l’expérience client.

Règles strictes de conversation :

1. Tu poses UNE seule question à la fois.
2. Tu prends une commande complète :
   - Pizza ou panini
   - Garniture
   - Taille (normale ou XL)
   - Mode : sur place, à emporter ou livraison
3. Si livraison → adresse OBLIGATOIRE avant validation.
4. Si sur place ou à emporter → ne demande pas l’adresse.
5. Tu reformules toujours la commande complète avant confirmation.
6. Tu demandes : "Je vous confirme la commande ?"
7. Tu termines uniquement par :
   "Votre commande est confirmée, merci et à très bientôt chez O'Sezam Pizza."

Important :
- Ne parle JAMAIS anglais.
- Ne pose jamais plusieurs questions en même temps.
- Reste synthétique.
`,
    voice: "alloy"
  }
});


  // 🔁 Audio Twilio → OpenAI
  twilioSocket.on("message", (msg) => {
    const data = JSON.parse(msg);

    if (data.event === "media") {
      openaiSocket.send({
        type: "input_audio_buffer.append",
        audio: data.media.payload
      });
    }

    if (data.event === "stop") {
      openaiSocket.close();
    }
  });

  // 🔁 Audio OpenAI → Twilio
  openaiSocket.on("message", (msg) => {
    const response = JSON.parse(msg);

    if (response.type === "response.output_audio.delta") {
      twilioSocket.send(JSON.stringify({
        event: "media",
        media: {
          payload: response.delta
        }
      }));
    }
  });

});

app.get("/", (req, res) => {
  res.send("Realtime voice running");
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Realtime server ready");
});
