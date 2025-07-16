// File: api/mongodb.js

import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Missing MONGODB_URI environment variable");
}

const client = new MongoClient(uri);

export default async function handler(req, res) {
  try {
    await client.connect();

    const db = client.db("EchoDrift");
    const collection = db.collection("Modules"); // Use the correct collection

    const data = await collection.find({}).toArray();
    res.status(200).json(data);
  } catch (error) {
    console.error("MongoDB connection error:", error);
    res.status(500).json({ error: "Failed to fetch data" });
  } finally {
    await client.close();
  }
}
