const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.post("/voice", (req, res) => {
  res.type("text/xml");
  res.send(`
<Response>
  <Gather input="speech" timeout="5" action="/process" method="POST" language="fr-FR">
    <Say language="fr-FR">
      Bonjour Osezam Pizza. Que souhaitez-vous commander ?
    </Say>
  </Gather>
</Response>
  `);
});

app.post("/process", async (req, res) => {
  const userSpeech = req.body.SpeechResult || "";

  try {
    const gptResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Tu es un agent vocal pour Osezam Pizza. Tu prends les commandes de pizza et panini de manière naturelle. Si des informations manquent, tu poses une question courte."
          },
          {
            role: "user",
            content: userSpeech
          }
        ],
        temperature: 0.7
      },
      {
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply = gptResponse.data.choices[0].message.content;

    res.type("text/xml");
    res.send(`
<Response>
  <Say language="fr-FR">
    ${reply}
  </Say>
  <Gather input="speech" timeout="5" action="/process" method="POST" language="fr-FR">
  </Gather>
</Response>
    `);

  } catch (error) {
    console.error(error.response?.data || error.message);

    res.type("text/xml");
    res.send(`
<Response>
  <Say language="fr-FR">
    Une erreur est survenue. Merci de rappeler.
  </Say>
</Response>
    `);
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Serveur GPT vocal démarré");
});
