const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.urlencoded({ extended: false }));

const ELEVEN_API_KEY = process.env.ELEVEN_API_KEY;
const ELEVEN_VOICE_ID = "xlVRtVJbKuO2nwbbopa2";

// Dossier audio temporaire
const AUDIO_DIR = path.join(__dirname, "audio");
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR);
}

// Route pour servir les mp3
app.get("/audio/:file", (req, res) => {
  const filePath = path.join(AUDIO_DIR, req.params.file);
  res.sendFile(filePath);
});

app.post("/voice", async (req, res) => {
  try {
    const eleven = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}`,
      {
        text: "Bonjour, ici Osezam Pizza. Test voix réaliste.",
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
</Response>
    `);

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.type("text/xml");
    res.send(`
<Response>
  <Say>Erreur Eleven.</Say>
</Response>
    `);
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Version MP3 fichier prête");
});
