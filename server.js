const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ELEVEN_API_KEY = process.env.ELEVEN_API_KEY;
const ELEVEN_VOICE_ID = "101A8UFM73tcrunWGirw";

let conversations = {};
let audioStore = {};

// 🔹 Servir l'audio
app.get("/audio/:id", (req, res) => {
  const audio = audioStore[req.params.id];
  if (!audio) return res.status(404).send("Not found");

  res.set("Content-Type", "audio/mpeg");
  res.send(audio);
});

// 🔹 Appel entrant
app.post("/voice", (req, res) => {
  const callSid = req.body.CallSid;
  conversations[callSid] = [];

  res.type("text/xml");
  res.send(`
<Response>
  <Gather input="speech" speechTimeout="auto" action="/process" method="POST" language="fr-FR">
    <Say language="fr-FR">
      Bonjour, vous êtes bien chez O'Sezam Pizza. Que souhaitez-vous commander ?
    </Say>
  </Gather>
</Response>
  `);
});

// 🔹 Traitement
app.post("/process", async (req, res) => {
  const callSid = req.body.CallSid;
  const userSpeech = req.body.SpeechResult || "";

  if (!conversations[callSid]) conversations[callSid] = [];

  conversations[callSid].push({
    role: "user",
    content: userSpeech
  });

  try {
    const gpt = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
Tu es un agent téléphonique professionnel pour O'Sezam Pizza.

Règles strictes :
- Tu poses UNE seule question à la fois.
- Tu prends la commande exacte : type (pizza ou panini), garniture, taille.
- Tu demandes si c'est sur place, à emporter ou en livraison.
- Si livraison → adresse OBLIGATOIRE.
- Si sur place → pas d'adresse.
- Tu récapitules clairement la commande avant validation.
- Quand la commande est validée, termine par : "Votre commande est confirmée."
`
          },
          ...conversations[callSid]
        ],
        temperature: 0.5
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

    // 🔹 ElevenLabs
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

    const audioBuffer = Buffer.from(eleven.data);
    const audioId = Date.now().toString();
    audioStore[audioId] = audioBuffer;

    const audioUrl = `https://twilio-realtime-voice-test.onrender.com/audio/${audioId}`;

    // 🔹 Si commande confirmée → attendre 2 sec puis raccrocher
    if (reply.toLowerCase().includes("commande est confirmée") && conversations[callSid].length > 4) {
 {
      res.type("text/xml");
      res.send(`
<Response>
  <Play>${audioUrl}</Play>
  <Pause length="2"/>
  <Hangup/>
</Response>
      `);
      return;
    }

    // 🔹 Sinon continuer conversation
    res.type("text/xml");
    res.send(`
<Response>
  <Play>${audioUrl}</Play>
  <Gather input="speech" speechTimeout="auto" action="/process" method="POST" language="fr-FR"/>
</Response>
    `);

  } catch (err) {
    console.error(err.message);

    res.type("text/xml");
    res.send(`
<Response>
  <Say>Erreur technique.</Say>
</Response>
    `);
  }
});

app.listen(process.env.PORT || 3000);
