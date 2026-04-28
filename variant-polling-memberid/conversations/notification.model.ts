import { ObjectId } from 'mongodb';

export interface TelegramLink {
  _id?: ObjectId;
  memberId: ObjectId;
  chatId: string;
  linkedAt: Date;
}
