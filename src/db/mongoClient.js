const { MongoClient } = require("mongodb");
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

async function connectDB() {
  await client.connect();
  return client.db("mqtt_data");
}

module.exports = { client, connectDB };
