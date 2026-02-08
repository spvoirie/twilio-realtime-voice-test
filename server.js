const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// mémoire conversation par appel
let conversations = {};

app.post("/voice", (req, res) => {
  const callSid = req.body.CallSid;
  conversations[callSid] = [];

  res.type("text/xml");
  res.send(`
<Response>
  <Gather input="speech" speechTimeout="auto" action="/process" method="POST" language="fr-FR">
    <Say voice="Polly.Celine" language="fr-FR">
      Bonjour Osezam Pizza. Que souhaitez-vous commander ?
    </Say>
  </Gather>
</Response>
  `);
});

app.post("/process", async (req, res) => {
  const callSid = req.body.CallSid;
  const userSpeech = req.body.SpeechResult || "";

  if (!conversations[callSid]) {
    conversations[callSid] = [];
  }

  conversations[callSid].push({
    role: "user",
    content: userSpeech
  });

  try {
    const gptResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Tu es un agent vocal naturel pour Osezam Pizza. Réponses courtes, dynamiques, conversationnelles. Pose une seule question à la fois."
          },
          ...conversations[callSid]
        ],
        temperature: 0.6
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply = gptResponse.data.choices[0].message.content;

    conversations[callSid].push({
      role: "assistant",
      content: reply
    });

    res.type("text/xml");
    res.send(`
<Response>
  <Say voice="Polly.Celine" language="fr-FR">
    ${reply}
  </Say>
  <Gather input="speech" speechTimeout="auto" action="/process" method="POST" language="fr-FR">
  </Gather>
</Response>
    `);

  } catch (error) {
    console.error(error.message);

    res.type("text/xml");
    res.send(`
<Response>
  <Say language="fr-FR">
    Une erreur technique est survenue. Merci de rappeler.
  </Say>
</Response>
    `);
  }
});

app.listen(process.env.PORT || 3000);
