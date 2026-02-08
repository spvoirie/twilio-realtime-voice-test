const express = require("express");
const app = express();
app.use(express.urlencoded({ extended: false }));

app.post("/voice", (req, res) => {
  res.type("text/xml");
  res.send(`
<Response>
  <Play>https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3</Play>
</Response>
  `);
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Test audio externe");
});
