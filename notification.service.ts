import { Message, ConversationID } from './conversation.model';

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

async function broadcast(text: string): Promise<void> {
  const token = process.env.TELEGRAM_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('[notification] TELEGRAM_TOKEN ou TELEGRAM_CHAT_ID manquant — ignoré');
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

export async function sendNotification(message: Message, conversationId: ConversationID,): Promise<void> {
  await broadcast(formatText(message, conversationId));
}

// Test notification :
// fetch('http://localhost:3000/api/conversations/test-notification', { method: 'POST' })