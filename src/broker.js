const aedes = require("aedes")();
const net = require("net");

function startBroker(port = 1883) {
  const brokerServer = net.createServer(aedes.handle);

  brokerServer.listen(port, () => {
    console.log(`✅ MQTT Broker running on port ${port}`);
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

  return aedes; 
}

module.exports = { startBroker };
