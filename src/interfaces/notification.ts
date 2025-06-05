export interface INotification {
  id: string;
  content: string | JSX.Element;
  isRead: boolean;
  type: NOTIFICATION_TYPE;
  teamName?: string; // Info: (20250515 - Liz) 團隊邀請的團隊名稱
}

export enum NOTIFICATION_TYPE {
  GENERAL = 'general', // Info: (20250515 - Liz) 一般通知
  INVITATION = 'invitation', // Info: (20250515 - Liz) 團隊邀請通知
}

export enum NotificationType {
  GENERAL = 'GENERAL',
  INVITATION = 'INVITATION',
  ACCOUNT_BOOK = 'ACCOUNT_BOOK',
  INVOICE = 'INVOICE',
  CERTIFICATE = 'CERTIFICATE',
  PAYMENT = 'PAYMENT',
  SUBSCRIPTION = 'SUBSCRIPTION',
  TEAM_MEMBER = 'TEAM_MEMBER',
}

export enum NotificationEvent {
  TRANSFER = 'TRANSFER',
  UPDATED = 'UPDATED',
  EXPIRED = 'EXPIRED',
  REVIEWED = 'REVIEWED',
  REJECTED = 'REJECTED',
  APPROVED = 'APPROVED',
  RENEWED = 'RENEWED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  DELETED = 'DELETED',
  INVITED = 'INVITED',
}

export interface INotificationRC2 {
  id: number;
  userId: number;
  teamId?: number;
  teamName?: string;
  type: NotificationType;
  event: NotificationEvent;
  title: string;
  message: string;
  content: Record<string, string | number | boolean>;
  actionUrl?: string;
  imageUrl?: string;
  read: boolean;
  priority: number;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null;
}

export interface ICreateNotification {
  userId: number;
  teamId?: number;
  type: NotificationType;
  title: string;
  message: string;
  content: Record<string, string | number | boolean>;
  actionUrl?: string;
  imageUrl?: string;
  priority?: number;
  pushPusher?: boolean;
  sendEmail?: boolean;
  email?: {
    receiver: string;
    template: string;
  };
}

export interface IBulkCreateNotification extends Omit<ICreateNotification, 'userId' | 'email'> {
  userEmailMap: { userId: number; email: string }[];
}
