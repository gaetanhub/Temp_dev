import { ObjectId } from 'mongodb';
import { getDb } from '../configs/config.database';
import { TelegramLink } from './notification.model';

const COLLECTION = 'telegram_links';

export async function upsertTelegramLink(memberId: string, chatId: string): Promise<void> {
  const db = getDb();
  await db.collection<TelegramLink>(COLLECTION).updateOne(
    { memberId: new ObjectId(memberId) },
    { $set: { chatId, linkedAt: new Date() } },
    { upsert: true },
  );
}

export async function findAllChatIds(): Promise<string[]> {
  const db = getDb();
  const links = await db.collection<TelegramLink>(COLLECTION).find({}).toArray();
  return links.map((l) => l.chatId);
}
