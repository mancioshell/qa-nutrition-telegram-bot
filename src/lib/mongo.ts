import { MongoClient } from "mongodb";

export default async function getAtlasCollections(): Promise<
  [MongoClient, any, any]
> {
  const URI = `mongodb+srv://${process.env.MONGO_DB_USER}:${process.env.MONGO_DB_PASSWORD}@${process.env.MONGO_DB_ENDPOINT}/?retryWrites=true&w=majority`
  const client = new MongoClient(URI);
  const documentCollection = client
    .db(process.env.MONGO_DB_NAME!)
    .collection(process.env.MONGO_DB_COLLECTION!);

  const historyCollection = client
    .db(process.env.MONGO_DB_NAME!)
    .collection(process.env.MONGO_DB_HISTORY_COLLECTION!);
  return [client, documentCollection, historyCollection];
}
