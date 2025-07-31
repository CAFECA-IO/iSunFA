import { Tag, TeamPlanType } from '@prisma/client';
import prisma from '@/client';
import files from '@/seed_json/file.json';
import users from '@/seed_json/user.json';
import teams from '@/seed_json/team.json';
import country from '@/seed_json/country.json';
import companies from '@/seed_json/account_book.json';
import companyKYCs from '@/seed_json/account_book_kyc.json';
// import admins from '@/seed_json/admin.json';
import projects from '@/seed_json/project.json';
import IncomeExpenses from '@/seed_json/income_expense.json';
// import roles from '@/seed_json/role.json';
import users from '@/seed_json/user.json';
import milestones from '@/seed_json/milestone.json';

// Info (2024722 - Murky) - Uncomment this line to seed generated reports
// import generatedReports from '@/seed_json/generated_report.json';
import pendingReports from '@/seed_json/pending_report.json';
import departments from '@/seed_json/department.json';
import employees from '@/seed_json/employee.json';
import employeeProjects from '@/seed_json/employee_project.json';
import values from '@/seed_json/value.json';
import sales from '@/seed_json/sale.json';
import workRates from '@/seed_json/work_rate.json';
import plans from '@/seed_json/plan.json';
// import tPlans from '@/seed_json/t_plan.json';
import subscriptions from '@/seed_json/subscription.json';
import orders from '@/seed_json/order.json';
import paymentRecords from '@/seed_json/payment_record.json';
// import invitations from '@/seed_json/invitation.json';
import journals from '@/seed_json/journal.json';
import vouchers from '@/seed_json/voucher.json';
import lineItems from '@/seed_json/line_item.json';
import salaryRecords from '@/seed_json/salary_record.json';
import voucherSalaryRecordFolder from '@/seed_json/voucher_salary_record_folder.json';
import files from '@/seed_json/file.json';
import assets from '@/seed_json/asset.json';
import assetVouchers from '@/seed_json/asset_voucher.json';
import counterpartys from '@/seed_json/counterparty.json';
import certificates from '@/seed_json/certificate.json';
import voucherCertificates from '@/seed_json/voucher_certificate.json';
import accountingSettings from '@/seed_json/accounting_setting.json';
import userSettings from '@/seed_json/user_setting.json';
// import accountBookSettings from '@/seed_json/account_book_setting.json';
import userActionLogs from '@/seed_json/user_action_log.json';
import invoice from '@/seed_json/invoice.json';

// Info: (20241112 - Murky) Associate Related
import associateLineItems from '@/seed_json/associate_line_item.json';
import associateVouchers from '@/seed_json/associate_voucher.json';
import event from '@/seed_json/event.json';

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

async function createAccountBook() {
  await prisma.accountBook.createMany({
    data: companies.map((company) => ({
      ...company,
      tag: company.tag as Tag,
    })),
  });
}

async function createAccountBookKYC() {
  await prisma.accountBookKYC.createMany({
    data: companyKYCs,
  });
}

async function createCertificate() {
  await prisma.certificate.createMany({
    data: certificates,
  });
}

async function createDepartment() {
  await prisma.department.createMany({
    data: departments,
  });
}

async function createEmployee() {
  await prisma.employee.createMany({
    data: employees,
  });
}

async function createEmployeeProject() {
  await prisma.employeeProject.createMany({
    data: employeeProjects,
  });
}

async function createValue() {
  await prisma.value.createMany({
    data: values,
async function createCountry() {
  await prisma.country.createMany({
    data: country,
  });
}
async function createSale() {
  await prisma.sale.createMany({
    data: sales,
  });
}

async function createWorkRate() {
  await prisma.workRate.createMany({
    data: workRates,
  });
}

async function createPlan() {
  await prisma.plan.createMany({
    data: plans,
  });
}

async function createSubscription() {
  await prisma.subscription.createMany({
    data: subscriptions,
  });
}

async function createOrder() {
  await prisma.order.createMany({
    data: orders,
  });
}

async function createPaymentRecord() {
  await prisma.paymentRecord.createMany({
    data: paymentRecords,
  });
}

// async function createAdmin() {
//   await prisma.admin.createMany({
//     data: admins,
//   });
// }

async function createProjects() {
  await prisma.project.createMany({
    data: projects,
  });
}

async function createIncomeExpenses() {
  await prisma.incomeExpense.createMany({
    data: IncomeExpenses,
  });
}

// async function createInvitation() {
//   await prisma.invitation.createMany({
//     data: invitations,
//   });
// }

async function createJournal() {
  await prisma.journal.createMany({
    data: journals,
  });
}

async function createVoucher() {
  await prisma.voucher.createMany({
    data: vouchers,
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
    await createAccountBook();
    await new Promise((resolve) => {
      setTimeout(resolve, 3000);
    });
    await new Promise((resolve) => {
      setTimeout(resolve, 3000);
    });
    await createCounterparty();
    await createUserActionLog();
    await createAccountingSetting();
    // await createCompanySetting();
    await createUserSetting();
    // await createRole();
    await createAccountBookKYC();
    await createAccount();
  } finally {
    await prisma.$disconnect();
  }
}

main();
