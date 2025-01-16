import { ITeamInvoice, IUserOwnedTeam, TPaymentStatus, TPlanType } from '@/interfaces/subscription';

export const FAKE_INVOICE_LIST: ITeamInvoice[] = [
  {
    id: 100000,
    teamId: 3,
    status: false,
    issuedTimestamp: 1630406400000,
    dueTimestamp: 1630406400000,
    planId: TPlanType.PROFESSIONAL,
    planStartTimestamp: 1630406400000,
    planEndTimestamp: 1630406400000,
    planQuantity: 1,
    planUnitPrice: 1000,
    planAmount: 1000,
    payer: {
      name: 'John Doe',
      address: '1234 Main St',
      phone: '123-456-7890',
      taxId: '123456789',
    },
    payee: {
      name: 'Jane Doe',
      address: '5678 Elm St',
      phone: '098-765-4321',
      taxId: '987654321',
    },
    subtotal: 899,
    tax: 0,
    total: 899,
    amountDue: 899,
  },
  {
    id: 100001,
    teamId: 3,
    status: true,
    issuedTimestamp: 1630406400000,
    dueTimestamp: 1630406400000,
    planId: TPlanType.PROFESSIONAL,
    planStartTimestamp: 1630406400000,
    planEndTimestamp: 1630406400000,
    planQuantity: 1,
    planUnitPrice: 1000,
    planAmount: 1000,
    payer: {
      name: 'John Doe',
      address: '1234 Main St',
      phone: '123-456-7890',
      taxId: '123456789',
    },
    payee: {
      name: 'Jane Doe',
      address: '5678 Elm St',
      phone: '098-765-4321',
      taxId: '987654321',
    },
    subtotal: 899,
    tax: 0,
    total: 899,
    amountDue: 899,
  },
  {
    id: 100002,
    teamId: 3,
    status: true,
    issuedTimestamp: 1630406400000,
    dueTimestamp: 1630406400000,
    planId: TPlanType.PROFESSIONAL,
    planStartTimestamp: 1630406400000,
    planEndTimestamp: 1630406400000,
    planQuantity: 1,
    planUnitPrice: 1000,
    planAmount: 1000,
    payer: {
      name: 'John Doe',
      address: '1234 Main St',
      phone: '123-456-7890',
      taxId: '123456789',
    },
    payee: {
      name: 'Jane Doe',
      address: '5678 Elm St',
      phone: '098-765-4321',
      taxId: '987654321',
    },
    subtotal: 899,
    tax: 0,
    total: 899,
    amountDue: 899,
  },
  {
    id: 100003,
    teamId: 3,
    status: true,
    issuedTimestamp: 1630406400000,
    dueTimestamp: 1630406400000,
    planId: TPlanType.PROFESSIONAL,
    planStartTimestamp: 1630406400000,
    planEndTimestamp: 1630406400000,
    planQuantity: 1,
    planUnitPrice: 1000,
    planAmount: 1000,
    payer: {
      name: 'John Doe',
      address: '1234 Main St',
      phone: '123-456-7890',
      taxId: '123456789',
    },
    payee: {
      name: 'Jane Doe',
      address: '5678 Elm St',
      phone: '098-765-4321',
      taxId: '987654321',
    },
    subtotal: 899,
    tax: 0,
    total: 899,
    amountDue: 899,
  },
  {
    id: 100004,
    teamId: 3,
    status: true,
    issuedTimestamp: 1630406400000,
    dueTimestamp: 1630406400000,
    planId: TPlanType.PROFESSIONAL,
    planStartTimestamp: 1630406400000,
    planEndTimestamp: 1630406400000,
    planQuantity: 1,
    planUnitPrice: 1000,
    planAmount: 1000,
    payer: {
      name: 'John Doe',
      address: '1234 Main St',
      phone: '123-456-7890',
      taxId: '123456789',
    },
    payee: {
      name: 'Jane Doe',
      address: '5678 Elm St',
      phone: '098-765-4321',
      taxId: '987654321',
    },
    subtotal: 899,
    tax: 0,
    total: 899,
    amountDue: 899,
  },
  {
    id: 100005,
    teamId: 3,
    status: true,
    issuedTimestamp: 1630406400000,
    dueTimestamp: 1630406400000,
    planId: TPlanType.PROFESSIONAL,
    planStartTimestamp: 1630406400000,
    planEndTimestamp: 1630406400000,
    planQuantity: 1,
    planUnitPrice: 1000,
    planAmount: 1000,
    payer: {
      name: 'John Doe',
      address: '1234 Main St',
      phone: '123-456-7890',
      taxId: '123456789',
    },
    payee: {
      name: 'Jane Doe',
      address: '5678 Elm St',
      phone: '098-765-4321',
      taxId: '987654321',
    },
    subtotal: 899,
    tax: 0,
    total: 899,
    amountDue: 899,
  },
];

export const FAKE_OWNED_TEAMS: IUserOwnedTeam[] = [
  {
    id: 1,
    name: 'Personal',
    plan: TPlanType.BEGINNER,
    enableAutoRenewal: false,
    nextRenewalTimestamp: 0,
    expiredTimestamp: 0,
    paymentStatus: TPaymentStatus.FREE,
  },
  {
    id: 2,
    name: 'Team A',
    plan: TPlanType.PROFESSIONAL,
    enableAutoRenewal: true,
    nextRenewalTimestamp: 1736501802970,
    expiredTimestamp: 0,
    paymentStatus: TPaymentStatus.UNPAID,
  },
  {
    id: 3,
    name: 'Team B',
    plan: TPlanType.ENTERPRISE,
    enableAutoRenewal: false,
    nextRenewalTimestamp: 0,
    expiredTimestamp: 1630406400000,
    paymentStatus: TPaymentStatus.PAID,
  },
];

export async function updateSubscription(
  teamId: number,
  plan?: TPlanType,
  autoRenewal?: boolean
): Promise<{ success: boolean; error?: string; data?: IUserOwnedTeam }> {
  try {
    // Deprecate: (20250114 - Tzuhan) remove eslint-disable
    // eslint-disable-next-line no-console
    console.log(`Updating subscription for team ${teamId} to plan ${plan}`);
    const index = FAKE_OWNED_TEAMS.findIndex((team) => team.id === teamId);
    if (index < 0) {
      return { success: false, error: 'Team not found' };
    }
    // TODO: 替換為實際資料庫邏輯
    if (plan) {
      // Deprecate: (20250114 - Tzuhan) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log(`Plan set to ${plan}`);
      FAKE_OWNED_TEAMS[index].plan = plan;
    }

    if (autoRenewal !== undefined) {
      // Deprecate: (20250114 - Tzuhan) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log(`AutoRenewal set to ${autoRenewal}`);
      FAKE_OWNED_TEAMS[index].enableAutoRenewal = autoRenewal;
    }
    // 假資料庫操作邏輯
    // await db.team.update({ where: { id: teamId }, data: { plan, autoRenewal } });

    return { success: true, data: FAKE_OWNED_TEAMS[index] };
  } catch (error) {
    // Deprecate: (20250114 - Tzuhan) remove eslint-disable
    // eslint-disable-next-line no-console
    console.error('Error updating subscription:', error);
    return { success: false, error: 'Failed to update subscription' };
  }
}
