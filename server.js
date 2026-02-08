import WebSocket, { WebSocketServer } from "ws";
import express from "express";
import http from "http";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("Twilio connected");

  ws.on("message", (message) => {
    console.log("Received:", message.toString());
    ws.send(message);
  });

  ws.on("close", () => {
    console.log("Connection closed");
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
