import { IUserOwnedTeam, TPaymentStatus, TPlanType } from '@/interfaces/subscription';

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
