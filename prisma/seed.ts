import { Tag, TeamPlanType } from '@prisma/client';
import prisma from '@/client';
import files from '@/seed_json/file.json';
import users from '@/seed_json/user.json';
import teams from '@/seed_json/team.json';
import accounts from '@/seed_json/account.json';
import companies from '@/seed_json/company.json';
import country from '@/seed_json/country.json';
import teamPlans from '@/seed_json/team_plan.json';

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

async function createUser() {
  await prisma.user.createMany({
    data: users,
  });
}

async function createTeam() {
  await prisma.team.createMany({
    data: teams,
  });
}

async function createCompany() {
  await prisma.company.createMany({
    data: companies.map((company) => ({
      ...company,
      tag: company.tag as Tag,
    })),
  });
}

async function createCountry() {
  await prisma.country.createMany({
    data: country,
  });
}

async function createAccount() {
  await prisma.account.createMany({
    data: accounts,
  });
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
    await createTeamPlans();
    await createCountry();
    await createFile();
    await createUser();
    await createTeam();
    await createCompany();
    await createAccount();
  } finally {
    await prisma.$disconnect();
  }
}

main();
