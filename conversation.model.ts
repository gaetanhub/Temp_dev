import { AuditFields } from '../common/common.model';
import { EventID } from '../events/event.model';
import { CanalID } from '../canals/canal.model';
import { MemberID, TeamID } from '../teams/team.model';
import { RecordID } from '../records/record.model';
import { PlaceID } from '../places/place.model';

export type ConversationID = string;
export type MessageID = string;

export type Criticality = 'low' | 'medium' | 'high';

export interface Conversation extends AuditFields {
  conversationId: ConversationID;
  eventId: EventID;
  canalID: CanalID;

  memberIds: MemberID[];

  summary: string;
  criticality?: Criticality;
}

export interface Message extends AuditFields {
  id: MessageID;

  recordID?: RecordID;
  relatedToConversationId: ConversationID;
  fromMemberId?: MemberID;

  content: MessageContent[];
}

export interface MessageContent {
  placeId?: PlaceID;
  teamId?: TeamID;
  memberId?: MemberID;

  text: string;
}