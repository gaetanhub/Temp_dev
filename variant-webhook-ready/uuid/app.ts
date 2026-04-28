import express from 'express';
import conversationRoutes from './conversations/conversation.routes';
import telegramRoutes from './routes/telegram.routes';
import { errorHandler } from './middlewares/error-handler';

const app = express();

app.use(express.json());
app.use('/api/conversations', conversationRoutes);
app.use('/api/telegram', telegramRoutes);
app.use(errorHandler);

export default app;
