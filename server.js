import express from "express";
import { WebSocketServer } from "ws";
import WebSocket from "ws";
import http from "http";

const app = express();
const server = http.createServer(app);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const wss = new WebSocketServer({ server, path: "/media" });

wss.on("connection", (twilioSocket) => {

  console.log("Twilio connected");

  let openaiReady = false;
  let audioBufferQueue = [];

  const openaiSocket = new WebSocket(
    "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview",
    {
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Beta": "realtime=v1"
      }
    }
  );

  openaiSocket.on("open", () => {
    console.log("Connected to OpenAI realtime");

    openaiReady = true;

    openaiSocket.send(JSON.stringify({
      type: "session.update",
      session: {
        instructions: `
Tu es l’agent téléphonique officiel de O'Sezam Pizza.
Voix naturelle, chaleureuse et professionnelle.
Pose une seule question à la fois.
Prends commande complète (pizza/panini, taille, garniture, mode).
Si livraison → adresse obligatoire.
Récapitule avant validation.
Ne parle jamais anglais.
`
      }
    }));

    // 🔥 Envoie ce qui était bufferisé
    audioBufferQueue.forEach(audio => {
      openaiSocket.send(JSON.stringify({
        type: "input_audio_buffer.append",
        audio
      }));
    });

    audioBufferQueue = [];
  });

  // Twilio → OpenAI
  twilioSocket.on("message", (msg) => {
    const data = JSON.parse(msg);

    if (data.event === "media") {
      if (openaiReady) {
        openaiSocket.send(JSON.stringify({
          type: "input_audio_buffer.append",
          audio: data.media.payload
        }));
      } else {
        audioBufferQueue.push(data.media.payload);
      }
    }

    if (data.event === "stop") {
      openaiSocket.close();
    }
  });

  // OpenAI → Twilio
  openaiSocket.on("message", (msg) => {
    const response = JSON.parse(msg.toString());

    if (response.type === "response.output_audio.delta") {
      twilioSocket.send(JSON.stringify({
        event: "media",
        media: {
          payload: response.delta
        }
      }));
    }

    if (response.type === "response.completed") {
      openaiSocket.send(JSON.stringify({ type: "response.create" }));
    }
  });

  twilioSocket.on("close", () => {
    openaiSocket.close();
  });

});

app.get("/", (req, res) => {
  res.send("Realtime O'Sezam running");
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Realtime server ready");
});
