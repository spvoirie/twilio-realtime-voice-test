import express from "express";
import { WebSocketServer } from "ws";
import http from "http";

const app = express();
const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: "/media" });

wss.on("connection", (ws) => {
  console.log("WebSocket connected");

  ws.on("message", (msg) => {
    console.log("Message reçu :", msg.toString());
  });
});

app.get("/", (req, res) => {
  res.send("WS test running");
});

server.listen(process.env.PORT || 3000, () => {
  console.log("WS server ready");
});
