import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export default async function handler(req, res) {
  try {
    await client.connect();
    const db = client.db('EchoDrift');
    const collection = db.collection('Modules');
    const data = await collection.find({}).toArray();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: 'MongoDB connection failed', detail: e.message });
  } finally {
    await client.close();
  }
}
