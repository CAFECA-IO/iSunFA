import { ITeam, TeamRole, ITeamMember } from '@/interfaces/team';
import { TPlanType } from '@/interfaces/subscription';
import { IAccountBookForUser, WORK_TAG } from '@/interfaces/account_book';

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
      value: 'https://isunfa.com',
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
      value: 'https://isunfa.com',
      editable: true,
    },
    planType: {
      value: TPlanType.PROFESSIONAL,
      editable: false,
    },
    totalMembers: 2,
    totalAccountBooks: 2,
    bankAccount: {
      value: '-',
      editable: false,
    },
  },
  {
    id: 'TeamUID00003',
    imageId: '/images/fake_team_img.svg',
    role: TeamRole.VIEWER,
    name: {
      value: 'Team C',
      editable: false,
    },
    about: {
      value: 'About Team C',
      editable: false,
    },
    profile: {
      value: 'https://isunfa.com',
      editable: false,
    },
    planType: {
      value: TPlanType.BEGINNER,
      editable: false,
    },
    totalMembers: 1,
    totalAccountBooks: 1,
    bankAccount: {
      value: '-',
      editable: false,
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

export const FAKE_TEMA_ACCOUNT_BOOKS: IAccountBookForUser[] = [
  {
    company: {
      id: 1,
      imageId: '/images/company_1.svg',
      name: 'Company A',
      taxId: '12345678',
      startDate: 1672531200, // 2023-01-01 (UNIX timestamp)
      createdAt: 1672531200,
      updatedAt: 1672617600,
      isPrivate: false,
    },
    tag: WORK_TAG.ALL,
    order: 1,
    role: {
      id: 1,
      name: 'Accountant',
      permissions: ['view_reports', 'edit_transactions'],
      createdAt: 1672531200,
      updatedAt: 1672617600,
    },
  },
  {
    company: {
      id: 2,
      imageId: '/images/company_2.svg',
      name: 'Company B',
      taxId: '87654321',
      startDate: 1672531200,
      createdAt: 1672531200,
      updatedAt: 1672617600,
      isPrivate: true,
    },
    tag: WORK_TAG.FINANCIAL,
    order: 2,
    role: {
      id: 2,
      name: 'Auditor',
      permissions: ['view_audits', 'approve_reports'],
      createdAt: 1672531200,
      updatedAt: 1672617600,
    },
  },
  {
    company: {
      id: 3,
      imageId: '/images/company_3.svg',
      name: 'Company C',
      taxId: '56781234',
      startDate: 1672531200,
      createdAt: 1672531200,
      updatedAt: 1672617600,
      isPrivate: false,
    },
    tag: WORK_TAG.TAX,
    order: 3,
    role: {
      id: 3,
      name: 'Consultant',
      permissions: ['manage_clients', 'generate_reports'],
      createdAt: 1672531200,
      updatedAt: 1672617600,
    },
  },
];
