import { PrismaClient } from '@prisma/client';
// import accounts from './seed_json/account.json';
import company from './seed_json/company.json';
import admin from './seed_json/admin.json';
import projects from './seed_json/project.json';
import incomeExpenses from './seed_json/income_expense.json';
import milestones from './seed_json/milestone.json';
import generatedReports from './seed_json/generated_report.json';
import pendingReports from './seed_json/pending_report.json';

const prisma = new PrismaClient();

// const timestampInSeconds = (timestamp: number): number => {
//   if (timestamp > 10000000000) {
//     return Math.floor(timestamp / 1000);
//   }
//   return timestamp;
// };

// async function createAccount(nowTimestamp: number) {
//   accounts.map(async (account) => {
//     await prisma.account.create({
//       data: {
//         ...account,
//         createdAt: nowTimestamp,
//         updatedAt: nowTimestamp,
//       },
//     });
//   });
// }

async function createCompany() {
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
        name: project.name,
        stage: project.stage,
        companyId: project.company_id,
        completedPercent: project.completed_percent,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        totalExpense: project.total_expense,
        totalIncome: project.total_income,
        imageId: project.image_id,
      },
    });
  });
}

async function createIncomeExpenses() {
  incomeExpenses.map(async (incomeExpense) => {
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

async function createMilestones() {
  milestones.map(async (milestone) => {
    await prisma.milestone.create({
      data: {
        id: milestone.id,
        projectId: milestone.project_id,
        startDate: milestone.start_date,
        endDate: milestone.end_date,
        status: milestone.status,
        createdAt: milestone.created_at,
        updatedAt: milestone.updated_at,
      },
    });
  });
}

async function createGeneratedReports() {
  generatedReports.map(async (generatedReport) => {
    await prisma.report.create({
      data: {
        id: generatedReport.id,
        name: generatedReport.name,
        from: generatedReport.from,
        to: generatedReport.to,
        type: generatedReport.type,
        reportType: generatedReport.reportType,
        status: generatedReport.status,
        projectId: generatedReport?.projectId,
        reportLink: generatedReport.reportLink,
        downloadLink: generatedReport.downloadLink,
        blockChainExplorerLink: generatedReport.blockChainExplorerLink,
        evidenceId: generatedReport.evidenceId,
        createdAt: generatedReport.createdAt,
        updatedAt: generatedReport.updatedAt,
      },
    });
  });
}

async function createPendingReports() {
  pendingReports.map(async (pendingReport) => {
    await prisma.report.create({
      data: {
        id: pendingReport.id,
        name: pendingReport.name,
        from: pendingReport.from,
        to: pendingReport.to,
        type: pendingReport.type,
        reportType: pendingReport.reportType,
        status: pendingReport.status,
        remainingSeconds: pendingReport.remainingSeconds,
        paused: pendingReport.paused,
        createdAt: pendingReport.createdAt,
        updatedAt: pendingReport.updatedAt,
      },
    });
  });
}

async function main() {
  // const now = Date.now();
  // const nowTimestamp = timestampInSeconds(now);
  // Todo: Murky will modify createAccount seed data and uncomment related codes (20240611 - Gibbs)
  // await createAccount(nowTimestamp);
  await createCompany();
  await createAdmin();
  await createProjects();
  await new Promise((resolve) => {
    setTimeout(resolve, 3000);
  });
  await createIncomeExpenses();
  await new Promise((resolve) => {
    setTimeout(resolve, 3000);
  });
  await createMilestones();
  await new Promise((resolve) => {
    setTimeout(resolve, 3000);
  });
  await createGeneratedReports();
  await new Promise((resolve) => {
    setTimeout(resolve, 3000);
  });
  await createPendingReports();
  await new Promise((resolve) => {
    setTimeout(resolve, 3000);
  });
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
