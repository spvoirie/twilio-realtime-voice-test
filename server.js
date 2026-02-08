const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.urlencoded({ extended: false }));

const ELEVEN_API_KEY = process.env.ELEVEN_API_KEY;
const ELEVEN_VOICE_ID = "xlVRtVJbKuO2nwbbopa2";

app.post("/voice", async (req, res) => {
  try {
    const eleven = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}`,
      {
        text: "Bonjour, ici Osezam Pizza. Ceci est un test vocal final.",
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

    const audioBase64 = Buffer.from(eleven.data).toString("base64");

    res.type("text/xml");
    res.send(`
<Response>
  <Play>data:audio/mpeg;base64,${audioBase64}</Play>
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
  console.log("Test direct Eleven");
});
