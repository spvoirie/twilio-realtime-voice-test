const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.urlencoded({ extended: false }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ELEVEN_API_KEY = process.env.ELEVEN_API_KEY;
const ELEVEN_VOICE_ID = "xlVRtVJbKuO2nwbbopa2";

let conversations = {};
let audioStore = {};

// 🔹 Route pour servir l'audio Eleven
app.get("/audio/:id", (req, res) => {
  const audio = audioStore[req.params.id];
  if (!audio) return res.status(404).send("Not found");

  res.set("Content-Type", "audio/mpeg");
  res.send(audio);
});

// 🔹 Test Eleven direct (sans appel)
app.get("/test-eleven", async (req, res) => {
  try {
    const eleven = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}`,
      {
        text: "Test voix Osezam Pizza",
        model_id: "eleven_multilingual_v2"
      },
      {
        headers: {
          "xi-api-key": ELEVEN_API_KEY,
          "Content-Type": "application/json"
        },
        responseType: "arraybuffer"
      }
    );

    res.set("Content-Type", "audio/mpeg");
    res.send(eleven.data);

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("Erreur Eleven");
  }
});

// 🔹 Appel entrant
app.post("/voice", (req, res) => {
  const callSid = req.body.CallSid;
  conversations[callSid] = [];

  res.type("text/xml");
  res.send(`
<Response>
  <Gather input="speech" speechTimeout="auto" action="/process" method="POST" language="fr-FR">
    <Say>Bonjour, vous êtes bien chez O'Sezam Pizza. Que souhaitez-vous commander ?</Say>
  </Gather>
</Response>
  `);
});

// 🔹 Traitement conversation
app.post("/process", async (req, res) => {
  const callSid = req.body.CallSid;
  const userSpeech = req.body.SpeechResult || "";

  if (!conversations[callSid]) conversations[callSid] = [];

  conversations[callSid].push({ role: "user", content: userSpeech });

  try {
    const gpt = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Agent téléphonique O'Sezam Pizza. Une question à la fois."
          },
          ...conversations[callSid]
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply = gpt.data.choices[0].message.content;

    conversations[callSid].push({ role: "assistant", content: reply });

    const eleven = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}`,
      {
        text: reply,
        model_id: "eleven_multilingual_v2"
      },
      {
        headers: {
          "xi-api-key": ELEVEN_API_KEY,
          "Content-Type": "application/json"
        },
        responseType: "arraybuffer"
      }
    );

    const audioId = Date.now().toString();
    audioStore[audioId] = Buffer.from(eleven.data);

    const audioUrl = `https://twilio-realtime-voice-test.onrender.com/audio/${audioId}`;

    res.type("text/xml");
    res.send(`
<Response>
  <Play>${audioUrl}</Play>
  <Pause length="1"/>
  <Gather input="speech" speechTimeout="auto" action="/process" method="POST" language="fr-FR"/>
</Response>
    `);

  } catch (err) {
    console.error(err.response?.data || err.message);

    res.type("text/xml");
    res.send(`
<Response>
  <Say>Erreur technique.</Say>
</Response>
    `);
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Version audio URL prête");
});
