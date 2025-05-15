export interface INotification {
  id: string;
  content: string | JSX.Element;
  isRead: boolean;
  type: NOTIFICATION_TYPE;
}

export enum NOTIFICATION_TYPE {
  GENERAL = 'general', // Info: (20250515 - Liz) 一般通知
  INVITATION = 'invitation', // Info: (20250515 - Liz) 團隊邀請通知
}
