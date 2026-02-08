const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.urlencoded({ extended: false }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ELEVEN_API_KEY = process.env.ELEVEN_API_KEY;
const ELEVEN_VOICE_ID = "xlVRtVJbKuO2nwbbopa2";

let conversations = {};

// 🔹 Route de test Eleven (optionnelle mais utile)
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

  conversations[callSid].push({
    role: "user",
    content: userSpeech
  });

  try {
    // 🧠 GPT
    const gpt = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
Tu es l'agent téléphonique officiel de O'Sezam Pizza.

Règles :
- Une seule question à la fois.
- Prendre pizza ou panini.
- Demander garniture.
- Demander taille.
- Demander sur place, à emporter ou livraison.
- Si livraison → adresse obligatoire.
- Récapituler clairement.
- Terminer par "Votre commande est confirmée." uniquement quand tout est validé.
`
          },
          ...conversations[callSid]
        ],
        temperature: 0.4
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply = gpt.data.choices[0].message.content;

    conversations[callSid].push({
      role: "assistant",
      content: reply
    });

    // 🎙 ElevenLabs
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

    const audioBase64 = Buffer.from(eleven.data).toString("base64");

    // 🔴 Si commande confirmée → pause + raccroche
    if (
      reply.toLowerCase().includes("votre commande est confirmée") &&
      conversations[callSid].length > 4
    ) {
      res.type("text/xml");
      res.send(`
<Response>
  <Play>data:audio/mpeg;base64,${audioBase64}</Play>
  <Pause length="2"/>
  <Hangup/>
</Response>
      `);
      return;
    }

    // 🔄 Continuer conversation
    res.type("text/xml");
    res.send(`
<Response>
  <Play>data:audio/mpeg;base64,${audioBase64}</Play>
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
  console.log("Agent vocal final prêt");
});
