export interface ICampaignData {
  id: string;
  code: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  bonusPoints: string;
  bonusModules: string[];
  isActive: boolean;
  participantCount: number;
  totalPointsIssued: number;
}
