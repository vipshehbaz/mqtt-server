const aedes = require("aedes")();
const net = require("net");
const mqtt = require("mqtt");

const BROKER_PORT = 1883;

const brokerServer = net.createServer(aedes.handle);
brokerServer.listen(BROKER_PORT, () => {
  console.log("MQTT Broker is running on port", BROKER_PORT);

  const client = mqtt.connect(`mqtt://localhost:${BROKER_PORT}`);

  client.on("connect", () => {
    console.log("MQTT Client connected");

    client.subscribe("devices/+/data", (err) => {
      if (err) console.error("Subscribe error:", err);
      else console.log("Subscribed to: devices/+/data");
    });
  });

  client.on("message", (topic, payload) => {
    const message = payload.toString();
    console.log(`Incoming message on ${topic}:`, message);

    const parts = topic.split("/");
    const deviceId = parts[1];

    const response = { status: "ok", received: message, timestamp: Date.now() };
    const responseTopic = `devices/${deviceId}/response`;

    client.publish(responseTopic, JSON.stringify(response), { qos: 0 });
    console.log("Sent response to:", responseTopic);
  });

  client.on("error", (err) => console.error("MQTT Client error:", err));
});

aedes.on("client", (client) =>
  console.log("Broker: client connected:", client.id)
);
aedes.on("clientDisconnect", (client) =>
  console.log("Broker: client disconnected:", client.id)
);
