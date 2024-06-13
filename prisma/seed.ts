import { PrismaClient } from '@prisma/client';
import accounts from './seed_json/account.json';
import companies from './seed_json/company.json';
import admin from './seed_json/admin.json';
import projects from './seed_json/project.json';
import IncomeExpenses from './seed_json/income_expense.json';
import roles from './seed_json/role.json';
import user from './seed_json/user.json';

const prisma = new PrismaClient();

const timestampInSeconds = (timestamp: number): number => {
  if (timestamp > 10000000000) {
    return Math.floor(timestamp / 1000);
  }
  return timestamp;
};

async function createRole() {
  await Promise.all(roles.map(async (role) => {
    await prisma.role.create({
      data: {
        id: role.id,
        name: role.name,
        permissions: role.permissions,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      },
    });
  }));
}

async function createUser() {
    await prisma.user.create({
      data: {
        id: user.id,
        name: user.name,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        credentialId: user.credentialId,
        publicKey: user.publicKey,
        algorithm: user.algorithm,
        imageId: user.imageId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
  });
}

async function createAccount(nowTimestamp: number) {
  accounts.map(async (account) => {
    await prisma.account.create({
      data: {
        type: account.type,
        liquidity: account.liquidity,
        code: account.code,
        name: account.name,
        companyId: account.companyId,
        system: account.system,
        debit: account.debit,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      },
    });
  });
}

async function createCompany() {
  await Promise.all(companies.map(async (company) => {
    await prisma.company.create({
      data: {
        id: company.id,
        name: company.name,
        code: company.code,
        regional: company.regional,
        kycStatus: company.kyc_status,
        imageId: company.image_id,
        startDate: company.start_date,
        createdAt: company.created_at,
        updatedAt: company.updated_at,
      },
    });
  }));
}

async function createAdmin() {
  await prisma.admin.create({
    data: {
      email: admin.email,
      status: admin.status,
      userId: admin.user_id,
      companyId: admin.company_id,
      roleId: admin.role_id,
      startDate: admin.start_date,
      endDate: admin.end_date,
      createdAt: admin.created_at,
      updatedAt: admin.updated_at,
    },
  });
}

async function createProjects() {
  projects.map(async (project) => {
    await prisma.project.create({
      data: {
        id: project.id,
        companyId: project.company_id,
        name: project.name,
        completedPercent: project.completed_percent,
        imageId: project.image_id,
        stage: project.stage,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
      },
    });
  });
}

async function createIncomeExpenses() {
  IncomeExpenses.map(async (incomeExpense) => {
    await prisma.incomeExpense.create({
      data: {
        income: incomeExpense.income,
        expense: incomeExpense.expense,
        projectId: incomeExpense.project_id,
        companyId: incomeExpense.company_id,
        createdAt: incomeExpense.created_at,
        updatedAt: incomeExpense.updated_at,
      },
    });
  });
}

async function ocr() {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  await prisma.ocr.create({
    data: {
      id: 1,
      imageUrl: '',
      imageName: 'no_ocr.jpg',
      imageSize: 0,
      aichResultId: 'no_aich_result_id',
      status: 'SUCCESS',
      companyId: 1,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    },
  });
}
async function main() {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  // Todo: Murky will modify createAccount seed data and uncomment related codes (20240611 - Gibbs)
  await createRole();
  await createUser();
  await createCompany();
  await createAccount(nowTimestamp);
  await createAdmin();
  await createProjects();
  await new Promise((resolve) => { setTimeout(resolve, 5000); });
  await createIncomeExpenses();

  await ocr();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    // Info (20240316 - Murky) - Log error and disconnect prisma
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
