import { ObjectId } from 'mongodb';
import { getDb } from '../configs/config.database';
import { TelegramLink } from './notification.model';

const COLLECTION = 'telegram_links';

export async function upsertTokenForMember(
  memberId: string,
  token: string,
  tokenExpiresAt: Date,
): Promise<void> {
  const db = getDb();
  await db.collection<TelegramLink>(COLLECTION).updateOne(
    { memberId: new ObjectId(memberId) },
    { $set: { token, tokenExpiresAt, chatId: null } },
    { upsert: true },
  );
}

export async function findByToken(token: string): Promise<TelegramLink | null> {
  const db = getDb();
  return db.collection<TelegramLink>(COLLECTION).findOne({ token });
}

export async function linkChatId(memberId: ObjectId, chatId: string): Promise<void> {
  const db = getDb();
  await db.collection<TelegramLink>(COLLECTION).updateOne(
    { memberId },
    { $set: { chatId, linkedAt: new Date() } },
  );
}

export async function findAllChatIds(): Promise<string[]> {
  const db = getDb();
  const links = await db
    .collection<TelegramLink>(COLLECTION)
    .find({ chatId: { $ne: null } })
    .toArray();
  return links.map((l) => l.chatId as string);
}
