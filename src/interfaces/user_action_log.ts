import { UserActionLogActionType } from '@/constants/user_action_log';

export interface IUserActionLog {
  id: number;
  sessionId: string;
  userId: number;
  actionType: UserActionLogActionType;
  actionDescription: string;
  actionTime: number;
  ipAddress: string;
  userAgent: string;
  apiEndpoint: string;
  httpMethod: string;
  requestPayload: Record<string, string>;
  httpStatusCode: number;
  statusMessage: string;
}
