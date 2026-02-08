const express = require("express");
const axios = require("axios");

const app = express();

const ELEVEN_API_KEY = process.env.ELEVEN_API_KEY;

// ✅ Ton vrai Voice ID intégré
const ELEVEN_VOICE_ID = "xlVRtVJbKuO2nwbbopa2";

// Route de test Eleven
app.get("/test-eleven", async (req, res) => {
  try {
    const eleven = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}`,
      {
        text: "Bonjour, ici Osezam Pizza. Ceci est un test de voix.",
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

app.listen(process.env.PORT || 3000, () => {
  console.log("Test Eleven prêt");
});

