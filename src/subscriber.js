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
    client.subscribe("gateway/+/temperature", { qos: 1 });
  });

  client.on("message", async (topic, payload, packet) => {
    console.log("Received Topic", topic);
    console.log("Received Payload", payload);
    if (topic.startsWith("$SYS")) return;

    try {
      const rawPayload = payload.toString();
      const parsedPayload = safeJsonParse(rawPayload);
      console.log("Parsed Payload", parsedPayload);

      const macId = topic.split("/")[1];
      if (!macId) return;

      const message = {
        time: new Date(),
        metadata: { deviceId: macId },
        payload: parsedPayload ?? rawPayload,
        retained: packet.retain === true,
      };

      await insertDeviceMessage(db, message);

      console.log("✅ Message saved to DB for device:", macId);

      client.publish(
        `devices/${macId}/response`,
        JSON.stringify({ status: "ok", timestamp: Date.now() }),
        { qos: 0 }
      );
    } catch (err) {
      console.error("❌ DB insert failed:", err);
    }
  });
}

module.exports = { setupSubscriber };
