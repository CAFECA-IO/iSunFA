export interface NotificationType {
  id: string;
  content: string | JSX.Element;
  isRead: boolean;
  type: 'text' | 'button';
}
