const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.urlencoded({ extended: false }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ELEVEN_API_KEY = process.env.ELEVEN_API_KEY;
const ELEVEN_VOICE_ID = "xlVRtVJbKuO2nwbbopa2";

const AUDIO_DIR = path.join(__dirname, "audio");
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR);
}

app.get("/audio/:file", (req, res) => {
  const filePath = path.join(AUDIO_DIR, req.params.file);
  if (!fs.existsSync(filePath)) return res.status(404).send("Not found");
  res.sendFile(filePath);
});

app.post("/voice", (req, res) => {
  res.type("text/xml");
  res.send(`
<Response>
  <Gather input="speech" action="/process" method="POST" language="fr-FR">
    <Say>Bonjour, vous êtes bien chez O'Sezam Pizza. Que souhaitez-vous commander ?</Say>
  </Gather>
</Response>
  `);
});

app.post("/process", async (req, res) => {
  try {
    const userSpeech = req.body.SpeechResult || "";

    // GPT
    const gpt = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Agent O'Sezam Pizza. Réponses très courtes. Une seule question à la fois." },
          { role: "user", content: userSpeech }
        ],
        max_tokens: 100
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply = gpt.data.choices[0].message.content;

    // Eleven
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

    const filename = `voice-${Date.now()}.mp3`;
    const filePath = path.join(AUDIO_DIR, filename);
    fs.writeFileSync(filePath, eleven.data);

    const audioUrl = `https://twilio-realtime-voice-test.onrender.com/audio/${filename}`;

    res.type("text/xml");
    res.send(`
<Response>
  <Play>${audioUrl}</Play>
  <Gather input="speech" action="/process" method="POST" language="fr-FR"/>
</Response>
    `);

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.type("text/xml");
    res.send(`
<Response>
  <Say>Une erreur est survenue.</Say>
</Response>
    `);
  }
});

app.listen(process.env.PORT || 3000);
