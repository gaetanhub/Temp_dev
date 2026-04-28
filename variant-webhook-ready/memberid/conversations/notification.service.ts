import { Message, ConversationID } from './conversation.model';
import * as notificationDatabase from './notification.database';
import { processTelegramUpdate, TelegramUpdate } from './telegram.processor';

const TELEGRAM_API_URL = 'https://api.telegram.org';

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

async function sendDM(chatId: string, text: string): Promise<void> {
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

async function poll(): Promise<void> {
  try {
    const updates = await fetchUpdates();
    for (const update of updates) {
      offset = update.update_id + 1;
      await processTelegramUpdate(update);
    }
  } catch (error) {
    console.error('[notification] Erreur de polling:', error);
  }
}

export function startPolling(): void {
  if (process.env.TELEGRAM_POLLING_ENABLED === 'false') return;
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
      await sendDM(chatId, text);
    } catch (error) {
      console.error(`[notification] Échec envoi à chatId ${chatId}:`, error);
    }
  }
}
