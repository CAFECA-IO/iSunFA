export interface ICompanySetting {
  id: number;
  companyId: number;
  autoRenewal: boolean;
  notifyTiming: number;
  notifyChannel: string;
  reminderFreq: number;
  createdAt: number;
  updatedAt: number;
}
