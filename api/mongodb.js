import { MongoClient } from "mongodb";

let cachedClient = null;

export default async function handler(req, res) {
  const uri = process.env.MONGODB_URI;

  if (!cachedClient) {
    const client = new MongoClient(uri);
    try {
      await client.connect();
      cachedClient = client;
      console.log("New MongoDB connection established");
    } catch (error) {
      console.error("MongoDB connection error:", error);
      return res.status(500).json({ error: "MongoDB connection failed", detail: error.message
