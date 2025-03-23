import {
  WORK_TAG,
  IAccountBookForUser,
  IAccountBookForUserWithTeam,
} from '@/interfaces/account_book';

import { TeamRole } from '@/interfaces/team';
import { TPlanType } from '@/interfaces/subscription';
import { SortBy, SortOrder } from '@/constants/sort';

export const FAKE_COMPANY_AND_ROLE_LIST: IAccountBookForUser[] = [
  {
    company: {
      id: 1,
      imageId: '/images/fake_team_img.svg',
      name: 'Company AAAAAA',
      taxId: '12345678',
      startDate: 1234567890,
      createdAt: 1234567890,
      updatedAt: 1234567890,
    },
    role: {
      id: 1,
      name: 'Role A',
      permissions: ['permission1', 'permission2'],
      createdAt: 1234567890,
      updatedAt: 1234567890,
    },
    order: 1,
    tag: WORK_TAG.ALL,
  },
  {
    company: {
      id: 2,
      imageId: '/images/fake_team_img.svg',
      name: 'Company BBB',
      taxId: '12345678',
      startDate: 1234567890,
      createdAt: 1234567890,
      updatedAt: 1234567890,
    },
    role: {
      id: 2,
      name: 'Role B',
      permissions: ['permission1', 'permission2'],
      createdAt: 1234567890,
      updatedAt: 1234567890,
    },
    order: 2,
    tag: WORK_TAG.FINANCIAL,
  },
  {
    company: {
      id: 3,
      imageId: '/images/fake_team_img.svg',
      name: 'Company C',
      taxId: '12345678',
      startDate: 1234567890,
      createdAt: 1234567890,
      updatedAt: 1234567890,
    },
    role: {
      id: 3,
      name: 'Role C',
      permissions: ['permission1', 'permission2'],
      createdAt: 1234567890,
      updatedAt: 1234567890,
    },
    order: 3,
    tag: WORK_TAG.TAX,
  },
  {
    company: {
      id: 4,
      imageId: '/images/fake_team_img.svg',
      name: 'Company DD',
      taxId: '12345678',
      startDate: 1234567890,
      createdAt: 1234567890,
      updatedAt: 1234567890,
    },
    role: {
      id: 4,
      name: 'Role D',
      permissions: ['permission1', 'permission2'],
      createdAt: 1234567890,
      updatedAt: 1234567890,
    },
    order: 4,
    tag: WORK_TAG.ALL,
  },
  {
    company: {
      id: 5,
      imageId: '/images/fake_team_img.svg',
      name: 'Company EEEEEEEEEEEEEE',
      taxId: '12345678',
      startDate: 1234567890,
      createdAt: 1234567890,
      updatedAt: 1234567890,
    },
    role: {
      id: 5,
      name: 'Role E',
      permissions: ['permission1', 'permission2'],
      createdAt: 1234567890,
      updatedAt: 1234567890,
    },
    order: 5,
    tag: WORK_TAG.FINANCIAL,
  },
];

export const FAKE_COMPANY_AND_ROLE_LIST_WITH_TEAM: IAccountBookForUserWithTeam[] = [
  {
    company: {
      id: 1,
      imageId: '/images/fake_team_img.svg',
      name: 'Company AAAAAA',
      taxId: '12345678',
      startDate: 1234567890,
      createdAt: 1234567890,
      updatedAt: 1234567890,
    },
    role: {
      id: 1,
      name: 'Role A',
      permissions: ['permission1', 'permission2'],
      createdAt: 1234567890,
      updatedAt: 1234567890,
    },
    order: 1,
    tag: WORK_TAG.ALL,
    team: {
      id: 1,
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
    isTransferring: false,
  },
  {
    company: {
      id: 2,
      imageId: '/images/fake_team_img.svg',
      name: 'Company BBB',
      taxId: '12345678',
      startDate: 1234567890,
      createdAt: 1234567890,
      updatedAt: 1234567890,
    },
    role: {
      id: 2,
      name: 'Role B',
      permissions: ['permission1', 'permission2'],
      createdAt: 1234567890,
      updatedAt: 1234567890,
    },
    order: 2,
    tag: WORK_TAG.FINANCIAL,
    team: {
      id: 2,
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
    isTransferring: false,
  },
  {
    company: {
      id: 3,
      imageId: '/images/fake_team_img.svg',
      name: 'Company C',
      taxId: '12345678',
      startDate: 1234567890,
      createdAt: 1234567890,
      updatedAt: 1234567890,
    },
    role: {
      id: 3,
      name: 'Role C',
      permissions: ['permission1', 'permission2'],
      createdAt: 1234567890,
      updatedAt: 1234567890,
    },
    order: 3,
    tag: WORK_TAG.TAX,
    team: {
      id: 2,
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
    isTransferring: false,
  },
  {
    company: {
      id: 4,
      imageId: '/images/fake_team_img.svg',
      name: 'Company DD',
      taxId: '12345678',
      startDate: 1234567890,
      createdAt: 1234567890,
      updatedAt: 1234567890,
    },
    role: {
      id: 4,
      name: 'Role D',
      permissions: ['permission1', 'permission2'],
      createdAt: 1234567890,
      updatedAt: 1234567890,
    },
    order: 4,
    tag: WORK_TAG.ALL,
    team: {
      id: 2,
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
    isTransferring: true,
  },
  {
    company: {
      id: 5,
      imageId: '/images/fake_team_img.svg',
      name: 'Company EEEEEEEEEEEEEE',
      taxId: '12345678',
      startDate: 1234567890,
      createdAt: 1234567890,
      updatedAt: 1234567890,
    },
    role: {
      id: 5,
      name: 'Role E',
      permissions: ['permission1', 'permission2'],
      createdAt: 1234567890,
      updatedAt: 1234567890,
    },
    order: 5,
    tag: WORK_TAG.FINANCIAL,
    team: {
      id: 1,
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
    isTransferring: false,
  },
];

export const DEFAULT_SORT_OPTIONS = [{ sortBy: SortBy.CREATED_AT, sortOrder: SortOrder.DESC }];
