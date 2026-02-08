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
Tu es l'agent vocal officiel de O'Sezam Pizza.
Tu es naturel, fluide, professionnel.
Tu poses une seule question à la fois.
Tu prends commande pizza ou panini, taille, garniture, livraison ou sur place.
Si livraison → adresse obligatoire.
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
