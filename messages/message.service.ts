import { PaginatedResult, PaginationParams } from '../common/common.model';
import { ConversationID, Message } from './conversation.model';
import * as database from './message.database';

export async function listMessagesForConversation(
  conversationId: ConversationID,
  paginationParams: PaginationParams,
): Promise<PaginatedResult<Message>> {
  const count = await database.countMessagesForConversation(conversationId);
  const messages = await database.findManyMessagesForConversation(conversationId, paginationParams.limit, paginationParams.offset);

  return {
    items: messages,
    total: count,
    limit: paginationParams.limit,
    offset: paginationParams.offset,
  };
}
