import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
console.log("Using URI:", uri);

const client = new MongoClient(uri);

export default async function handler(req, res) {
  try {
    console.log("Connecting to Mongo...");
    await client.connect();
    console.log("Connected");

    const db = client.db("EchoDrift");
    const collection = db.collection("Modules");
    const data = await collection.find({}).toArray();

    console.log("Fetched data:", data);
    res.status(200).json(data);
  } catch (error) {
    console.error("MongoDB error:", error);
    res.status(500).json({ error: "Failed to connect to MongoDB", detail: error.message });
  } finally {
    await client.close();
  }
}
