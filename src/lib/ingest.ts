import "dotenv/config";

import { YoutubeLoader } from "@langchain/community/document_loaders/web/youtube";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { CohereEmbeddings } from "@langchain/cohere";
import { Document } from "@langchain/core/documents";
import { Innertube, UniversalCache } from "youtubei.js";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import getAtlasCollection from "./mongo";

const youtubeUrl = "https://www.youtube.com/watch";

const splitter = new RecursiveCharacterTextSplitter({});

async function loadDocuments(url: string[]) {
  let docs: Document<Record<string, any>>[] = [];

  let i = 0;

  for (const youtubeUrl of url) {
    console.log(`Loading ${youtubeUrl}`);

    try {
      const loader = YoutubeLoader.createFromUrl(`${youtubeUrl}`, {
        language: "it",
        addVideoInfo: true,
      });

      const doc = await loader.load();
      const docOutput = await splitter.splitDocuments(doc);
      docs = docs.concat(docOutput);
      console.log(`Loaded ${i + 1} documents`);
      i++;
    } catch (e) {
      console.log(`Error loading ${youtubeUrl}`);
    }
  }

  return docs;
}

async function ingest(docs: Document<Record<string, any>>[]) {
  const [client, collection] = await getAtlasCollection();

  console.log(`Ingesting ${docs.length} documents`);

  await MongoDBAtlasVectorSearch.fromDocuments(
    docs,
    new CohereEmbeddings({
      apiKey: process.env.COHERE_API_KEY!,
    }),
    {
      collection,
      indexName: process.env.ATLAS_INDEX_NAME!,
      textKey: "text",
      embeddingKey: "embedding",
    }
  );

  console.log("All documents ingested!");

  await client.close();
}

async function getVideoUrlListByChannelId() {
  const youtube = await Innertube.create({
    cache: new UniversalCache(false),
  });

  let channel = await youtube.getChannel(process.env.YOU_TUBE_CHANNEL_ID!);

  let channelVideos = await channel.getVideos();
  let results = [...channelVideos.videos];
  let feed = channelVideos;
  while (feed.has_continuation) {
    // @ts-ignore
    feed = await feed.getContinuation();
    results.push(...feed.videos);
  }

  const videoUrls = results.map((video: any) => `${youtubeUrl}?v=${video.id}`);

  console.log(videoUrls.length);

  return videoUrls;
}

async function main() {
  const videoUrls = await getVideoUrlListByChannelId();
  console.log(videoUrls);
  const docs = await loadDocuments(videoUrls);
  await ingest(docs);
}

main();
