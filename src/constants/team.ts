import { ITeam } from '@/interfaces/team';
import { TPlanType } from '@/interfaces/subscription';

export const FAKE_TEAM_LIST: ITeam[] = [
  {
    id: '1',
    name: {
      value: 'Team A',
      editable: true,
    },
    about: {
      value: 'About Team A',
      editable: true,
    },
    profile: {
      value: 'Profile Team A',
      editable: true,
    },
    planType: {
      value: TPlanType.ENTERPRISE,
      editable: true,
    },
    totalMembers: 3,
    totalAccountBooks: 3,
    bankAccount: {
      value: '12345678',
      editable: true,
    },
  },
  {
    id: '2',
    name: {
      value: 'Team B',
      editable: true,
    },
    about: {
      value: 'About Team B',
      editable: true,
    },
    profile: {
      value: 'Profile Team B',
      editable: true,
    },
    planType: {
      value: TPlanType.PROFESSIONAL,
      editable: true,
    },
    totalMembers: 2,
    totalAccountBooks: 2,
    bankAccount: {
      value: '12345678',
      editable: true,
    },
  },
];
