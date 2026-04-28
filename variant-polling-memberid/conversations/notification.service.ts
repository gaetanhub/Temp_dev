import { Message, ConversationID } from './conversation.model';
import * as notificationDatabase from './notification.database';

const TELEGRAM_API_URL = 'https://api.telegram.org';

interface TelegramUpdate {
  update_id: number;
  message?: {
    chat: { id: number };
    text?: string;
  };
}

function formatText(message: Message, conversationId: ConversationID): string {
  const textPreview = message.content.map((c) => c.text).join(' / ');
  return [
    `<b>Nouveau message RadioLog</b>`,
    ``,
    `Conversation : <code>${conversationId}</code>`,
    ``,
    `De : <code>${message.fromMemberId ?? 'Inconnu'}</code>`,
    ``,
    `Contenu du message : ${textPreview}`,
  ].join('\n');
}

async function sendMessage(chatId: string | number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_TOKEN;
  if (!token) {
    console.warn('[notification] TELEGRAM_TOKEN manquant — ignoré');
    return;
  }
  const response = await fetch(`${TELEGRAM_API_URL}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Telegram API ${response.status}: ${error}`);
  }
}

let offset = 0;

async function fetchUpdates(): Promise<TelegramUpdate[]> {
  const token = process.env.TELEGRAM_TOKEN;
  if (!token) return [];
  const response = await fetch(
    `${TELEGRAM_API_URL}/bot${token}/getUpdates?offset=${offset}&timeout=0`,
  );
  if (!response.ok) return [];
  const data = (await response.json()) as { result: TelegramUpdate[] };
  return data.result ?? [];
}

async function processUpdate(update: TelegramUpdate): Promise<void> {
  offset = update.update_id + 1;
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

async function poll(): Promise<void> {
  try {
    const updates = await fetchUpdates();
    for (const update of updates) {
      await processUpdate(update);
    }
  } catch (error) {
    console.error('[notification] Erreur de polling:', error);
  }
}

export function startPolling(): void {
  setInterval(poll, 3000);
}

export function getTelegramLink(memberId: string): string {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  if (!botUsername) throw new Error('TELEGRAM_BOT_USERNAME manquant');
  return `https://t.me/${botUsername}?start=${memberId}`;
}

export async function sendNotification(message: Message, conversationId: ConversationID): Promise<void> {
  const chatIds = await notificationDatabase.findAllChatIds();
  const text = formatText(message, conversationId);
  for (const chatId of chatIds) {
    try {
      await sendMessage(chatId, text);
    } catch (error) {
      console.error(`[notification] Échec envoi à chatId ${chatId}:`, error);
    }
  }
}
