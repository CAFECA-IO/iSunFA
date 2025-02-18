import { ITeam, TeamRole } from '@/interfaces/team';
import { TPlanType } from '@/interfaces/subscription';

export const FAKE_TEAM_LIST: ITeam[] = [
  {
    id: 'TeamUID00001',
    imageId: '/images/fake_team_img.svg',
    role: TeamRole.OWNER,
    name: {
      value: 'Team A',
      editable: true,
    },
    about: {
      value: 'About Team A',
      editable: true,
    },
    profile: {
      value:
        'https://static-cdn.jtvnw.net/jtv_user_pictures/44ed4bd3-5f4f-47e6-b89b-90de65386dbb-profile_banner-480.png',
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
    id: 'TeamUID00002',
    imageId: '/images/fake_team_img.svg',
    role: TeamRole.OWNER,
    name: {
      value: 'Team B',
      editable: true,
    },
    about: {
      value: 'About Team B',
      editable: true,
    },
    profile: {
      value: 'https://i.pinimg.com/236x/cc/48/41/cc4841ce4212d47ca59c5ec0e63f53bc.jpg',
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
  {
    id: 'TeamUID00003',
    imageId: '/images/fake_team_img.svg',
    role: TeamRole.OWNER,
    name: {
      value: 'Team C',
      editable: true,
    },
    about: {
      value: 'About Team C',
      editable: true,
    },
    profile: {
      value: 'https://i.pinimg.com/736x/ea/78/01/ea78014cd14a79714042729c661bd46c.jpg',
      editable: true,
    },
    planType: {
      value: TPlanType.BEGINNER,
      editable: true,
    },
    totalMembers: 1,
    totalAccountBooks: 1,
    bankAccount: {
      value: '87654321',
      editable: true,
    },
  },
];
