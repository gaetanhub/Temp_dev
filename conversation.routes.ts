import { UserID } from '../users/user.model';

export type ISODateTime = string; // e.g. "2026-07-03T10:30:00Z"

export interface Address {
  line1: string;
  line2?: string;
  postalCode: string;
  city: string;
  country: string;
}

export interface AuditFields {
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  createdById?: UserID;
  updatedById?: UserID;
}

export interface PaginationParams {
  query?: string;
  limit: number;
  offset: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
