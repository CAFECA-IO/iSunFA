import { ITeam, TeamRole, ITeamMember } from '@/interfaces/team';
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
    totalMembers: 6,
    totalAccountBooks: 3,
    bankAccount: {
      value: '12345678',
      editable: true,
    },
  },
  {
    id: 'TeamUID00002',
    imageId: '/images/fake_team_img.svg',
    role: TeamRole.ADMIN,
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
    role: TeamRole.VIEWER,
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

export const FAKE_TEAM_MEMBER_LIST: ITeamMember[] = [
  {
    id: 'MemberUID00001',
    name: 'User A',
    imageId: '/images/fake_avatar.png',
    email: 'MemberUID00001@gamil.com',
    role: TeamRole.OWNER,
    editable: false,
  },
  {
    id: 'MemberUID00002',
    name: 'User B',
    imageId: '/images/fake_avatar.png',
    email: 'MemberUID00002@gamil.com',
    role: TeamRole.ADMIN,
    editable: true,
  },
  {
    id: 'MemberUID00003',
    name: 'User C',
    imageId: '/images/fake_avatar.png',
    email: 'MemberUID00003@gamil.com',
    role: TeamRole.ADMIN,
    editable: true,
  },
  {
    id: 'MemberUID00004',
    name: 'User D',
    imageId: '/images/fake_avatar.png',
    email: 'MemberUID00004@gamil.com',
    role: TeamRole.EDITOR,
    editable: true,
  },
  {
    id: 'MemberUID0000555555',
    name: 'User E',
    imageId: '/images/fake_avatar.png',
    email: 'MemberUID0000555555@gamil.com',
    role: TeamRole.VIEWER,
    editable: true,
  },
  {
    id: 'MemberUID00006',
    name: 'User F',
    imageId: '/images/fake_avatar.png',
    email: '666@gamil.com',
    role: TeamRole.VIEWER,
    editable: true,
  },
];

export const FAKE_EMAIL_LIST: string[] = [
  'alice@example.com',
  'anna@example.com',
  'anna_cry_cry@example.com',
  'bob@example.com',
  'bobby@example.com',
  'bobbzzz@example.com',
  'bobbzzz123@example.com',
  'julian@example.com',
  'julian_1@example.com',
  'star@example.com',
  'straw@example.com',
  'strawberry@example.com',
  'frank@example.com',
  'frank11@example.com',
  'frank22@example.com',
  'frank33@example.com',
  'frank44@example.com',
];
