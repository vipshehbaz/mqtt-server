require("dotenv").config();
const { connectDB } = require("./db/mongoClient");
const { setupSubscriber } = require("./subscriber");
const aedes = require("aedes")();
const net = require("net");

const BROKER_PORT = 1883;

async function main() {
  const db = await connectDB();
  console.log("✅ Connected to MongoDB");

  const brokerServer = net.createServer(aedes.handle);
  brokerServer.listen(BROKER_PORT, () => {
    console.log(`✅ MQTT Broker running on port ${BROKER_PORT}`);
  });

  aedes.on("client", (client) => console.log("🔌 Broker: client connected:", client.id));
  aedes.on("clientDisconnect", (client) => console.log("❌ Broker: client disconnected:", client.id));

  setupSubscriber(db, BROKER_PORT);
}

main();
