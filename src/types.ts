export interface Room {
  id: string;
  name: string;
  capacity: number;
  equipment: string[];
}

export interface Reservation {
  id: string;
  roomId: string;
  subject: string;
  startTime: string; // ISO String for easier comparison/display
  endTime: string;
  organizerId: string;
  organizerName: string;
  organizerEmail: string;
  participants: string[];
  createdAt: string;
  updatedAt: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}
