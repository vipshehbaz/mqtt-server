const aedes = require("aedes")();
const net = require("net");
const mqtt = require("mqtt");
const fs = require("fs");
const path = require("path");

const BROKER_PORT = 1883;
const DATA_DIR = path.join(__dirname);
const JSON_FILE = path.join(DATA_DIR, "messages.ndjson");

if (!fs.existsSync(JSON_FILE)) {
  fs.writeFileSync(JSON_FILE, "", "utf8");
}

function saveMessage(entry) {
  fs.appendFile(JSON_FILE, JSON.stringify(entry) + "\n", (err) => {
    if (err) {
      console.error("❌ File write error:", err);
    }
  });
}

function safeJsonParse(input) {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

const brokerServer = net.createServer(aedes.handle);

brokerServer.listen(BROKER_PORT, () => {
  console.log(`✅ MQTT Broker running on port ${BROKER_PORT}`);
});

aedes.on("client", (client) => {
  console.log("🔌 Broker: client connected:", client.id);
});

aedes.on("clientDisconnect", (client) => {
  console.log("❌ Broker: client disconnected:", client.id);
});

aedes.on("publish", (packet, client) => {
  const from = client ? client.id : "BROKER_INTERNAL";
  console.log(
    `📨 PUBLISH from=${from} topic=${packet.topic} qos=${packet.qos} retain=${packet.retain}`
  );
});

const client = mqtt.connect(`mqtt://localhost:${BROKER_PORT}`);

client.on("connect", () => {
  console.log("✅ Server MQTT client connected to broker");

  client.subscribe("#", { qos: 1 }, (err, granted) => {
    if (err) {
      console.error("❌ Subscribe error:", err);
      return;
    }

    console.log("✅ Subscribed to:", granted.map((g) => g.topic).join(", "));
  });
});

client.on("message", (topic, payload, packet) => {
  const rawPayload = payload.toString();
  const parsedPayload = safeJsonParse(rawPayload);

  console.log(`\n📥 Incoming message`);
  console.log("Topic:", topic);
  console.log("Payload:", parsedPayload ?? rawPayload);

  const macId = topic.split("/")[1];
  if (!macId) {
    console.warn("⚠️ Invalid topic format, skipping response");
    return;
  }

  const responseTopic = `devices/${macId}/response`;
  const response = {
    status: "ok",
    timestamp: Date.now(),
  };

  client.publish(responseTopic, JSON.stringify(response), { qos: 0 });
  console.log("📡 Response sent →", responseTopic);

  saveMessage({
    topic,
    macId,
    payload: parsedPayload ?? rawPayload,
    timestamp: new Date().toISOString(),
    retained: packet.retain === true,
  });
});

client.on("error", (err) => {
  console.error("❌ MQTT Client error:", err);
});

client.on("offline", () => {
  console.warn("⚠️ MQTT Client offline");
});

client.on("reconnect", () => {
  console.log("🔄 MQTT Client reconnecting...");
});
