import { Collection, Document as MongoDBDocument } from "mongodb";
import { BaseListChatMessageHistory } from "@langchain/core/chat_history";
import {
  BaseMessage,
  mapChatMessagesToStoredMessages,
  mapStoredMessagesToChatMessages,
} from "@langchain/core/messages";

export interface MongoDBChatMessageHistoryInput {
  collection: Collection<MongoDBDocument>;
  sessionId: string;
  limit?: number;
}

/**
 * @example
 * ```typescript
 * const chatHistory = new MongoDBChatMessageHistory({
 *   collection: myCollection,
 *   sessionId: 'unique-session-id',
 * });
 * const messages = await chatHistory.getMessages();
 * await chatHistory.clear();
 * ```
 */
export class MongoDBChatMessageHistory extends BaseListChatMessageHistory {
  lc_namespace = ["langchain", "stores", "message", "mongodb"];

  private collection: Collection<MongoDBDocument>;

  private sessionId: string;

  private limit: number;

  private idKey = "sessionId";

  constructor({ collection, sessionId, limit = 4 }: MongoDBChatMessageHistoryInput) {
    super();
    this.collection = collection;
    this.sessionId = sessionId;
    this.limit = limit;
  }

  async getMessages(): Promise<BaseMessage[]> {
    const document = await this.collection.findOne({
      [this.idKey]: this.sessionId,
    });
    const messages = document?.messages || [];
    return mapStoredMessagesToChatMessages(messages.slice(-this.limit));
  }

  async addMessage(message: BaseMessage): Promise<void> {
    const messages = mapChatMessagesToStoredMessages([message]);
    await this.collection.updateOne(
      { [this.idKey]: this.sessionId },
      {
        // @ts-ignore
        $push: { messages: { $each: messages } },
      },
      { upsert: true }
    );
  }

  async clear(): Promise<void> {
    await this.collection.deleteOne({ [this.idKey]: this.sessionId });
  }
}
