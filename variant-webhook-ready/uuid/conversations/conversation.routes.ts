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
import { generateTelegramLink } from './notification.service';

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
  },
);

conversationRoutes.get(
  '/telegram-link/:memberId',
  requirePermissions([Permissions.READ_DATA]),
  async (request: AuthenticatedRequest, response: Response) => {
    const { memberId } = request.params;
    const link = await generateTelegramLink(memberId);
    response.status(200).json({ link });
  },
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
  },
);

export default conversationRoutes;
