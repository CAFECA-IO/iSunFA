import prisma from '@/client';
import { TPlanType } from '@/interfaces/subscription';
import { IPaymentPlanSchema } from '@/lib/utils/zod_schema/payment_plan';

/**
 * Info: (20250310 - Shirley) Get all team plans from database
 * @returns Array of team plans with their features
 */
export async function listTeamPlan(): Promise<IPaymentPlanSchema[]> {
  // Info: (20250310 - Shirley) Get team plans from database with their features
  const teamPlans = await prisma.teamPlan.findMany({
    include: {
      features: true,
    },
    orderBy: {
      price: 'asc',
    },
  });

  // Info: (20250310 - Shirley) Transform database data to API response format
  const paymentPlans: IPaymentPlanSchema[] = teamPlans.map((plan) => {
    // Info: (20250310 - Shirley) Group features by feature key
    const featuresMap = new Map<string, { id: string; name: string; value: string | string[] }>();

    plan.features.forEach((feature) => {
      // Info: (20250310 - Shirley) If feature already exists in map, check if it's an array
      if (featuresMap.has(feature.featureKey)) {
        const existingFeature = featuresMap.get(feature.featureKey)!;

        // Info: (20250310 - Shirley) If value is already an array, add new value
        if (Array.isArray(existingFeature.value)) {
          (existingFeature.value as string[]).push(feature.featureValue);
        } else {
          // Info: (20250310 - Shirley) Convert to array with both values
          existingFeature.value = [existingFeature.value as string, feature.featureValue];
        }
      } else {
        // Info: (20250310 - Shirley) Add new feature to map
        featuresMap.set(feature.featureKey, {
          id: feature.featureKey,
          name: feature.featureKey.toUpperCase(),
          value: feature.featureValue,
        });
      }
    });

    // Info: (20250310 - Shirley) Convert map to array
    const features = Array.from(featuresMap.values());

    return {
      id: plan.type as TPlanType,
      planName: plan.planName,
      price: plan.price,
      extraMemberPrice: plan.extraMemberPrice || undefined,
      features,
    };
  });

  return paymentPlans;
}

/**
 * Info: (20250310 - Shirley) Get team plan by type
 * @param type Team plan type
 * @returns Team plan with its features or null if not found
 */
export async function getTeamPlanByType(type: TPlanType): Promise<IPaymentPlanSchema | null> {
  // Info: (20250310 - Shirley) Get team plan from database with its features
  const teamPlan = await prisma.teamPlan.findUnique({
    where: {
      type,
    },
    include: {
      features: true,
    },
  });

  // Info: (20250310 - Shirley) Return null if team plan not found
  if (!teamPlan) {
    return null;
  }

  // Info: (20250310 - Shirley) Group features by feature key
  const featuresMap = new Map<string, { id: string; name: string; value: string | string[] }>();

  teamPlan.features.forEach((feature) => {
    // Info: (20250310 - Shirley) If feature already exists in map, check if it's an array
    if (featuresMap.has(feature.featureKey)) {
      const existingFeature = featuresMap.get(feature.featureKey)!;

      // Info: (20250310 - Shirley) If value is already an array, add new value
      if (Array.isArray(existingFeature.value)) {
        (existingFeature.value as string[]).push(feature.featureValue);
      } else {
        // Info: (20250310 - Shirley) Convert to array with both values
        existingFeature.value = [existingFeature.value as string, feature.featureValue];
      }
    } else {
      // Info: (20250310 - Shirley) Add new feature to map
      featuresMap.set(feature.featureKey, {
        id: feature.featureKey,
        name: feature.featureKey.toUpperCase(),
        value: feature.featureValue,
      });
    }
  });

  // Info: (20250310 - Shirley) Convert map to array
  const features = Array.from(featuresMap.values());

  // Info: (20250310 - Shirley) Return formatted team plan
  return {
    id: teamPlan.type as TPlanType,
    planName: teamPlan.planName,
    price: teamPlan.price,
    extraMemberPrice: teamPlan.extraMemberPrice || undefined,
    features,
  };
}
