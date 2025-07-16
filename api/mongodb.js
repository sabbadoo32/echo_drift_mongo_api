import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://sebastianjames:d%402119ChartwellDrive@cluster0.gh4va.mongodb.net/EchoDrift?retryWrites=true&w=majority&appName=Cluster0";
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
