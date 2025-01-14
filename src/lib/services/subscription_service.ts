import { TPlanType } from '@/interfaces/subscription';

export async function updateSubscription(
  teamId: number,
  plan: TPlanType,
  autoRenewal?: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    // Deprecate: (20250114 - Tzuhan) remove eslint-disable
    // eslint-disable-next-line no-console
    console.log(`Updating subscription for team ${teamId} to plan ${plan}`);
    // TODO: 替換為實際資料庫邏輯
    if (autoRenewal !== undefined) {
      // Deprecate: (20250114 - Tzuhan) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log(`AutoRenewal set to ${autoRenewal}`);
    }

    // 假資料庫操作邏輯
    // await db.team.update({ where: { id: teamId }, data: { plan, autoRenewal } });

    return { success: true };
  } catch (error) {
    // Deprecate: (20250114 - Tzuhan) remove eslint-disable
    // eslint-disable-next-line no-console
    console.error('Error updating subscription:', error);
    return { success: false, error: 'Failed to update subscription' };
  }
}
