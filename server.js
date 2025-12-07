const aedes = require("aedes")();
const net = require("net");
const mqtt = require("mqtt");
const fs = require("fs");
const path = require("path");

const BROKER_PORT = 1883;
const JSON_FILE = path.join(__dirname, "messages.json");

if (!fs.existsSync(JSON_FILE)) {
  fs.writeFileSync(JSON_FILE, "", "utf8");
}

function saveMessage(entry) {
  fs.appendFile(JSON_FILE, JSON.stringify(entry) + "\n", (err) => {
    if (err) console.error("Write error:", err);
    else console.log("Message saved to file");
  });
}

const brokerServer = net.createServer(aedes.handle);
brokerServer.listen(BROKER_PORT, () => {
  console.log("MQTT Broker is running on port", BROKER_PORT);
});

const client = mqtt.connect(`mqtt://localhost:${BROKER_PORT}`);

client.on("connect", () => {
  console.log("Server (MQTT client) connected to broker");

  client.subscribe("gateway/+/advertisements", { qos: 1 }, (err, granted) => {
    if (err) console.error("Subscribe error:", err);
    else
      console.log(
        "Subscribed to topics:",
        granted.map((g) => g.topic).join(", ")
      );
  });
});

client.on("message", (topic, payload, packet) => {
  let message;

  try {
    message = JSON.parse(payload.toString());
  } catch (err) {
    console.error("Failed to parse payload as JSON:", err);
    message = { raw: payload.toString() };
  }

  console.log(`\nIncoming message on ${topic}:`);
  console.log(JSON.stringify(message, null, 2));

  const macId = topic.split("/")[1];

  const responseTopic = `devices/${macId}/response`;
  const response = { status: "ok", received: message, timestamp: Date.now() };
  client.publish(responseTopic, JSON.stringify(response), { qos: 0 });
  console.log("Sent response to:", responseTopic);

  // saveMessage({
  //   topic,
  //   macId,
  //   message,
  //   timestamp: new Date().toISOString(),
  //   retained: packet.retain
  // });
});

client.on("error", (err) => console.error("MQTT Client error:", err));
client.on("offline", () => console.log("Client offline"));
client.on("reconnect", () => console.log("Client reconnecting"));

aedes.on("client", (client) =>
  console.log("Broker: client connected:", client.id)
);
aedes.on("clientDisconnect", (client) =>
  console.log("Broker: client disconnected:", client.id)
);
aedes.on("publish", (packet, client) => {
  if (client) console.log(`Broker: ${client.id} published to ${packet.topic}`);
});
