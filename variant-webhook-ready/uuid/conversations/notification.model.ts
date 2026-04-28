import { ObjectId } from 'mongodb';

export interface TelegramLink {
  _id?: ObjectId;
  memberId: ObjectId;
  chatId: string | null;
  token: string;
  tokenExpiresAt: Date;
  linkedAt?: Date;
}
