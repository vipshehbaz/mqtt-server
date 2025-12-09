async function insertDeviceMessage(db, message) {
  const collection = db.collection("device_readings");
  await collection.insertOne(message);
}

module.exports = { insertDeviceMessage };
