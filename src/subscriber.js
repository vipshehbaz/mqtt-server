const mqtt = require("mqtt");
const { insertDeviceMessage } = require("./db/timeSeries");

function safeJsonParse(input) {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function setupSubscriber(db, brokerPort = 1883) {
  const client = mqtt.connect(`mqtt://localhost:${brokerPort}`);

  client.on("connect", () => {
    console.log("✅ MQTT client connected");
    client.subscribe("#", { qos: 1 });
  });

  client.on("message", async (topic, payload, packet) => {
    console.log("Received topic:", topic);
    console.log("Received payload", payload);

    if (topic.startsWith("$SYS")) return;

    const rawPayload = payload.toString();
    const parsedPayload = safeJsonParse(rawPayload);
    console.log("Parsed payload", parsedPayload)
    const macId = topic.split("/")[1];
    if (!macId) return;

    const message = {
      time: new Date(),
      metadata: { deviceId: macId },
      payload: parsedPayload ?? rawPayload,
      retained: packet.retain === true,
    };

    await insertDeviceMessage(db, message);

    const responseTopic = `devices/${macId}/response`;
    client.publish(
      responseTopic,
      JSON.stringify({ status: "ok", timestamp: Date.now() }),
      { qos: 0 }
    );
  });
}

module.exports = { setupSubscriber };
