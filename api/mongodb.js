import { MongoClient } from 'mongodb';

let cachedClient = null;

export default async function handler(req, res) {
  const uri = "mongodb+srv://sebastianjames:d%402119ChartwellDrive@cluster0.gh4va.mongodb.net/EchoDrift?retryWrites=true&w=majority&appName=Cluster0";

  console.log("Connecting to MongoDB...");

  try {
    if (!cachedClient) {
      const client = new MongoClient(uri);
      cachedClient = await client.connect();
      console.log("New MongoDB connection established");
    } else {
      console.log("Reusing cached MongoDB connection");
    }

    const db = cachedClient.db("EchoDrift");
    const collection = db.collection("Modules");
    const data = await collection.find({}).toArray();

    res.status(200).json(data);
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    res.status(500).json({ error: "Internal Server Error", detail: error.message });
  }
}
