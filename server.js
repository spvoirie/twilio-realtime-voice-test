const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

let session = {};

app.post("/voice", (req, res) => {
  res.type("text/xml");
  res.send(`
    <Response>
      <Gather input="speech" action="/step1" method="POST" language="fr-FR">
        <Say language="fr-FR">
          Bonjour Osezam Pizza. Quel est votre nom ?
        </Say>
      </Gather>
    </Response>
  `);
});

app.post("/step1", (req, res) => {
  session.nom = req.body.SpeechResult;

  res.type("text/xml");
  res.send(`
    <Response>
      <Gather input="speech" action="/step2" method="POST" language="fr-FR">
        <Say language="fr-FR">
          Merci ${session.nom}. Que souhaitez-vous commander ? Pizza ou panini ?
        </Say>
      </Gather>
    </Response>
  `);
});

app.post("/step2", (req, res) => {
  session.produit = req.body.SpeechResult;

  res.type("text/xml");
  res.send(`
    <Response>
      <Gather input="speech" action="/step3" method="POST" language="fr-FR">
        <Say language="fr-FR">
          Quelle taille ? Normale ou XL ?
        </Say>
      </Gather>
    </Response>
  `);
});

app.post("/step3", (req, res) => {
  session.taille = req.body.SpeechResult;

  res.type("text/xml");
  res.send(`
    <Response>
      <Gather input="speech" action="/confirm" method="POST" language="fr-FR">
        <Say language="fr-FR">
          Votre commande est-elle complète ?
        </Say>
      </Gather>
    </Response>
  `);
});

app.post("/confirm", (req, res) => {
  res.type("text/xml");
  res.send(`
    <Response>
      <Say language="fr-FR">
        Merci ${session.nom}. Je récapitule.
        Vous avez commandé ${session.produit} en taille ${session.taille}.
        Votre commande est confirmée.
      </Say>
    </Response>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  consol
