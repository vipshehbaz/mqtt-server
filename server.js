const aedes = require("aedes")();
const net = require("net");
const mqtt = require("mqtt");
const fs = require("fs");
const path = require("path");

const BROKER_PORT = 1883;
const JSON_FILE = path.join(__dirname, "messages.json");

// Ensure JSON file exists
if (!fs.existsSync(JSON_FILE)) {
  fs.writeFileSync(JSON_FILE, "[]", "utf8");
}

// Start MQTT broker
const brokerServer = net.createServer(aedes.handle);
brokerServer.listen(BROKER_PORT, () => {
  console.log("MQTT Broker is running on port", BROKER_PORT);
});

// Utility to save message safely
function saveMessage(entry) {
  fs.readFile(JSON_FILE, "utf8", (err, data) => {
    if (err) return console.error("Read error:", err);

    let fileData = [];
    try {
      fileData = JSON.parse(data);
    } catch (err) {
      console.error("Parse error, resetting file:", err);
    }

    fileData.push(entry);

    fs.writeFile(JSON_FILE, JSON.stringify(fileData, null, 2), "utf8", (err) => {
      if (err) console.error("Write error:", err);
      else console.log("Message saved to file");
    });
  });
}

// MQTT client for processing messages
const client = mqtt.connect(`mqtt://localhost:${BROKER_PORT}`);

client.on("connect", () => {
  console.log("Server (MQTT client) connected to broker");

  // Subscribe with QoS 1 to handle retained messages
  client.subscribe("#", { qos: 1 }, (err, granted) => {
    if (err) console.error("Subscribe error:", err);
    else console.log("Subscribed to:", granted.map(g => g.topic).join(", "));
  });
});

client.on("message", (topic, payload, packet) => {
  const message = payload.toString();
  console.log(`Incoming message on ${topic}:`, message);

  const deviceId = topic.split("/")[1];

  // Respond to the device
  const responseTopic = `devices/${deviceId}/response`;
  const response = { status: "ok", received: message, timestamp: Date.now() };
  client.publish(responseTopic, JSON.stringify(response), { qos: 0 });
  console.log("Sent response to:", responseTopic);

  // Save message
  // saveMessage({ topic, deviceId, message, timestamp: new Date().toISOString(), retained: packet.retain });
});

// Client error handling
client.on("error", (err) => console.error("MQTT Client error:", err));
client.on("offline", () => console.log("Client offline"));
client.on("reconnect", () => console.log("Client reconnecting"));

// Broker events
aedes.on("client", (client) => console.log("Broker: client connected:", client.id));
aedes.on("clientDisconnect", (client) => console.log("Broker: client disconnected:", client.id));
aedes.on("publish", (packet, client) => {
  if (client) console.log(`Broker: ${client.id} published to ${packet.topic}`);
});
