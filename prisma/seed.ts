import { PrismaClient, TeamPlanType } from '@prisma/client';
import accounts from '@/seed_json/account_new.json';
import files from '@/seed_json/file.json';
import lineItems from '@/seed_json/line_item.json';
import teamPlans from '@/seed_json/team_plan.json';
// Info (2024722 - Murky) - Uncomment this line to seed generated reports
// import generatedReports from '@/seed_json/generated_report.json';

const prisma = new PrismaClient();
async function createFile() {
  const data = files.map((f) => {
    return {
      ...f,
      iv: Buffer.from(f.iv, 'base64'),
    };
  });
  await prisma.file.createMany({
    data,
  });
}

async function createAccount() {
  await prisma.account.createMany({
    data: accounts,
  });
}

async function createLineItem(lineItem: {
  id: number;
  amount: number;
  description: string;
  accountCode: string;
  debit: boolean;
  voucherId: number;
  createdAt: number;
  updatedAt: number;
}) {
  const account = await prisma.account.findFirst({
    where: {
      code: lineItem.accountCode,
    },
    select: {
      id: true,
    },
  });
  if (!account) {
    throw new Error(`Account with code ${lineItem.accountCode} not found`);
  }
  await prisma.lineItem.createMany({
    data: [
      {
        id: lineItem.id,
        amount: lineItem.amount,
        description: lineItem.description,
        debit: lineItem.debit,
        createdAt: lineItem.createdAt,
        updatedAt: lineItem.updatedAt,
        accountId: account.id,
        voucherId: lineItem.voucherId,
      },
    ],
  });
}
async function createLineItems() {
  await Promise.all(lineItems.map((lineItem) => createLineItem(lineItem)));
}

async function createTeamPlans() {
  const now = Math.floor(Date.now() / 1000);
  await Promise.all(
    teamPlans.map(async (plan) => {
      const createdPlan = await prisma.teamPlan.upsert({
        where: { type: plan.type as TeamPlanType },
        update: {
          planName: plan.planName,
          price: plan.price,
          extraMemberPrice: plan.extraMemberPrice ?? null,
          updatedAt: now,
        },
        create: {
          type: plan.type as TeamPlanType,
          planName: plan.planName,
          price: plan.price,
          extraMemberPrice: plan.extraMemberPrice ?? null,
          createdAt: now,
          updatedAt: now,
        },
      });

      await Promise.all(
        plan.features.map((feature) =>
          prisma.teamPlanFeature.upsert({
            where: {
              planId_featureKey: {
                planId: createdPlan.id,
                featureKey: feature.featureKey,
              },
            },
            update: {
              featureValue: feature.featureValue,
              updatedAt: now,
            },
            create: {
              planId: createdPlan.id,
              featureKey: feature.featureKey,
              featureValue: feature.featureValue,
              createdAt: now,
              updatedAt: now,
            },
          })
        )
      );
    })
  );
}

async function main() {
  try {
    await createFile();

    await new Promise((resolve) => {
      setTimeout(resolve, 3000);
    });
    await new Promise((resolve) => {
      setTimeout(resolve, 3000);
    });
    await createAccount();
    await createTeamPlans();
    await createLineItems();
  } finally {
    await prisma.$disconnect();
  }
}

main();
