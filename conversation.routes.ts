import { Response, Router } from 'express';
import { PaginatedResult } from '../common/common.model';
import { Conversation } from './conversation.model';
import { listConversations } from './conversation.service';
import { listMessagesForConversation } from './message.service';
import { validateParams, validateQuery } from '../middlewares/schema-validator';
import { PaginationParams, paginationParamsSchema } from '../middlewares/paging.validator';
import { ConversationParams, conversationParamsSchema } from './conversation.validator';
import { AuthenticatedRequest, authGuard } from '../middlewares/auth.guard';
import { requirePermissions } from '../middlewares/require-permissions';
import { Permissions } from '../utils/permissions';
// début temp - Test notification Telegram
import { Message } from './conversation.model';
import { sendNotification } from './notification.service';
// fin temp

const conversationRoutes = Router();

conversationRoutes.use(authGuard);

conversationRoutes.get(
  '/',
  requirePermissions([Permissions.READ_DATA]),
  validateQuery(paginationParamsSchema),
  async (request: AuthenticatedRequest, response: Response) => {
    const paginationParams = request.parsedQuery as PaginationParams;
    const conversations: PaginatedResult<Conversation> = await listConversations(paginationParams);
    response.status(200).json(conversations);
  }
);

conversationRoutes.get(
  '/:conversationId/messages',
  requirePermissions([Permissions.READ_DATA]),
  validateParams(conversationParamsSchema),
  validateQuery(paginationParamsSchema),
  async (request: AuthenticatedRequest, response: Response) => {
    const { conversationId } = request.parsedParams as ConversationParams;
    const paginationParams = request.parsedQuery as PaginationParams;
    const messages = await listMessagesForConversation(conversationId, paginationParams);
    response.status(200).json(messages);
  }
);

// début temp - Test notification Telegram
conversationRoutes.post(
    '/test-notification',
    requirePermissions([Permissions.READ_DATA]),
    async (request: AuthenticatedRequest, response: Response) => {
        const testMessage: Message = {
            id: 'id_test',
            relatedToConversationId: 'conversationId_test',
            fromMemberId: 'memberId_test',
            content: [{ text: 'Message de test qui test' }],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await sendNotification(testMessage, 'test-conversation-id');
        response.status(200).json({ message: 'Notification envoyée' });
    },
);
// fin temp

export default conversationRoutes;