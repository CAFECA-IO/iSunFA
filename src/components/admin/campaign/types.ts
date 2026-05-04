export interface ICampaignData {
  id: string;
  code: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  bonusPoints: number;
  bonusModules: string[];
  isActive: boolean;
  participantCount: number;
  totalPointsIssued: number;
}
