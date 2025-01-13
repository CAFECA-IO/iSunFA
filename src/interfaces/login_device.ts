export interface ILoginDevice {
  id: string;
  userId: number;
  actionTime: number;
  ipAddress: string;
  userAgent: string;
  isCurrent: boolean;
}
