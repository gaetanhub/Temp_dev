import * as notificationDatabase from './notification.database';

export interface TelegramUpdate {
  update_id: number;
  message?: {
    chat: { id: number };
    text?: string;
  };
}

const TELEGRAM_API_URL = 'https://api.telegram.org';

async function sendMessage(chatId: number | string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_TOKEN;
  if (!token) return;
  await fetch(`${TELEGRAM_API_URL}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

export async function processTelegramUpdate(update: TelegramUpdate): Promise<void> {
  const text = update.message?.text;
  const chatId = update.message?.chat?.id;
  if (!text || !chatId) return;

  const match = text.match(/^\/start (.+)$/);
  if (!match) return;

  const memberId = match[1].trim();
  try {
    await notificationDatabase.upsertTelegramLink(memberId, String(chatId));
    await sendMessage(
      chatId,
      '✅ Ton compte RadioLog est maintenant relié.\nTu recevras les notifications directement ici.',
    );
  } catch (error) {
    console.error(`[notification] Erreur lors du traitement du /start pour memberId ${memberId}:`, error);
  }
}
