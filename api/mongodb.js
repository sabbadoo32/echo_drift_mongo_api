import { MongoClient } from "mongodb";

console.log("ENV DUMP:", process.env);

const uri = process.env.MONGODB_URI;
console.log("Using URI:", uri);

let cachedClient = null;

export default async function handler(req, res) {
  const collectionName = req.query.collection || 'Echo_Drifts';  // Default to Echo_Drifts if no collection specified
  if (!cachedClient) {
    const client = new MongoClient(uri);
    try {
      await client.connect();
      cachedClient = client;
      console.log("New MongoDB connection established");
    } catch (error) {
      console.error("MongoDB connection error:", error);
      return res.status(500).json({ error: "MongoDB connection failed", detail: error.message });
    }
  } else {
    console.log("Reusing cached MongoDB connection");
  }

  try {
    const db = cachedClient.db("EchoDrrift");
    const collection = db.collection(collectionName);
    const data = await collection.find({}).toArray();
    res.status(200).json(data);
  } catch (error) {
    console.error("MongoDB query error:", error);
    res.status(500).json({ error: "Query failed", detail: error.message });
  }
}

