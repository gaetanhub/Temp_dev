import { Request, Response, Router } from 'express';
import { processTelegramUpdate, TelegramUpdate } from '../conversations/telegram.processor';

const telegramRoutes = Router();

telegramRoutes.post('/webhook', async (request: Request, response: Response) => {
  const secret = request.headers['x-telegram-bot-api-secret-token'];
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    response.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const update = request.body as TelegramUpdate;
    await processTelegramUpdate(update);
  } catch (error) {
    console.error('[telegram] Erreur lors du traitement du webhook:', error);
  }

  response.status(200).json({ ok: true });
});

export default telegramRoutes;
