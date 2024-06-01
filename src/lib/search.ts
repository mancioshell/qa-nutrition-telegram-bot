import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import {
  RunnableConfig,
  RunnableWithMessageHistory,
  RunnablePassthrough,
} from "@langchain/core/runnables";

import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";

import { ChatTogetherAI } from "@langchain/community/chat_models/togetherai";
import { CohereEmbeddings } from "@langchain/cohere";
import { formatDocumentsAsString } from "langchain/util/document";
import { StringOutputParser } from "@langchain/core/output_parsers";

import getAtlasCollections from "@/lib/mongo";
import { ragSystemPrompt } from "@/prompts/rag-prompt";
import { standaloneSystemPrompt } from "@/prompts/standalone-system-prompt";
import { MongoDBChatMessageHistory } from "@/lib/chatHistory";

async function getSessionHistory(historyCollection: any, sessionId: string) {
  const chatHistory = new MongoDBChatMessageHistory({
    collection: historyCollection,
    sessionId: sessionId,
  });
  return chatHistory;
}

async function getQuestionPrompt() {
  const standaloneQuestionPrompt = ChatPromptTemplate.fromMessages([
    ["system", standaloneSystemPrompt],
    new MessagesPlaceholder("history"),
    ["human", "{question}"],
  ]);
  return standaloneQuestionPrompt;
}

async function getRagPrompt() {
  const ragPrompt = ChatPromptTemplate.fromMessages([
    ["system", ragSystemPrompt],
    new MessagesPlaceholder("history"),
    ["human", "{question}"],
  ]);

  return ragPrompt;
}

const model = new ChatTogetherAI({
  temperature: 0.2,
  togetherAIApiKey: process.env.TOGETHER_API_KEY!,
  modelName: process.env.MODEL_NAME!,
  verbose: false,
});

export async function clearSession(sessionId: string) {
  let mongoClient: any;
  try {
    const [client, _, historyCollection] = await getAtlasCollections();
    mongoClient = client;

    const sessionHistory = await getSessionHistory(
      historyCollection,
      sessionId
    );
    sessionHistory.clear();
  } catch (e) {
    console.log(e);
  } finally {
    if (mongoClient) mongoClient.close();
  }
}

export default async function search(question: string, sessionId: string) {
  let mongoClient: any;

  try {
    const [client, documentCollection, historyCollection] =
      await getAtlasCollections();

    mongoClient = client;

    const vectorStore = new MongoDBAtlasVectorSearch(
      new CohereEmbeddings({
        apiKey: process.env.COHERE_API_KEY!,
      }),
      {
        collection: documentCollection,
        indexName: process.env.ATLAS_INDEX_NAME!,
        textKey: "text",
        embeddingKey: "embedding",
      }
    );

    let retriever = vectorStore.asRetriever({
      searchType: "similarity",
      k: 20,
    });

    let questionPrompt = await getQuestionPrompt();
    const questionChain = questionPrompt
      .pipe(model)
      .pipe(new StringOutputParser());

    const retrieverChain = RunnablePassthrough.assign({
      documents: async () =>
        questionChain.pipe(retriever).pipe(formatDocumentsAsString),
    });

    const ragPrompt = await getRagPrompt();
    const ragChain = retrieverChain
      .pipe(ragPrompt)
      .pipe(model)
      .pipe(new StringOutputParser());

    const sessionHistory = await getSessionHistory(
      historyCollection,
      sessionId
    );

    const withHistory = new RunnableWithMessageHistory({
      runnable: ragChain,
      getMessageHistory: (_sessionId: string) => sessionHistory,
      inputMessagesKey: "question",
      historyMessagesKey: "history",
    });

    const config: RunnableConfig = { configurable: { sessionId: sessionId } };
    let output = await withHistory.invoke({ question: question }, config);
    return output;
  } catch (e) {
    console.log(e);
  } finally {
    if (mongoClient) mongoClient.close();
  }
}
