import { PrismaClient, TPlanType } from '@prisma/client';
import accounts from '@/seed_json/account_new.json';
import companies from '@/seed_json/company.json';
import companyKYCs from '@/seed_json/company_kyc.json';
import admins from '@/seed_json/admin.json';
import projects from '@/seed_json/project.json';
import IncomeExpenses from '@/seed_json/income_expense.json';
import roles from '@/seed_json/role.json';
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
import tPlans from '@/seed_json/t_plan.json';
import subscriptions from '@/seed_json/subscription.json';
import orders from '@/seed_json/order.json';
import paymentRecords from '@/seed_json/payment_record.json';
import invitations from '@/seed_json/invitation.json';
import journals from '@/seed_json/journal.json';
import vouchers from '@/seed_json/voucher.json';
import lineItems from '@/seed_json/line_item.json';
import salaryRecords from '@/seed_json/salary_record.json';
import voucherSalaryRecordFolder from '@/seed_json/voucher_salary_record_folder.json';
import file from '@/seed_json/file.json';
import assets from '@/seed_json/asset.json';
import assetVouchers from '@/seed_json/asset_voucher.json';
import counterpartys from '@/seed_json/counterparty.json';
import certificates from '@/seed_json/certificate.json';
import voucherCertificates from '@/seed_json/voucher_certificate.json';
import accountingSettings from '@/seed_json/accounting_setting.json';
import userSettings from '@/seed_json/user_setting.json';
import companySettings from '@/seed_json/company_setting.json';
import userActionLogs from '@/seed_json/user_action_log.json';
import invoice from '@/seed_json/invoice.json';

// Info: (20241112 - Murky) Associate Related
import associateLineItems from '@/seed_json/associate_line_item.json';
import associateVouchers from '@/seed_json/associate_voucher.json';
import event from '@/seed_json/event.json';

const prisma = new PrismaClient();
async function createFile() {
  const files = file.map((f) => {
    return {
      ...f,
      iv: Buffer.from(f.iv, 'base64'),
    };
  });
  await prisma.file.createMany({
    data: files,
  });
}
async function createSalaryRecord() {
  await prisma.salaryRecord.createMany({
    data: salaryRecords,
  });
}

async function createVoucherSalaryRecordFolder() {
  await prisma.voucherSalaryRecordFolder.createMany({
    data: voucherSalaryRecordFolder,
  });
}

async function createMilestones() {
  await prisma.milestone.createMany({
    data: milestones,
  });
}

// Info (20240722 - Murky) - Uncomment this line to seed generated reports
// async function createGeneratedReports() {
//   await prisma.report.createMany({
//     data: generatedReports,
//   });
// }

async function createPendingReports() {
  await prisma.report.createMany({
    data: pendingReports,
  });
}

async function createRole() {
  await prisma.role.createMany({
    data: roles,
  });
}

async function createUser() {
  await prisma.user.createMany({
    data: users,
  });
}

async function createAccount() {
  await prisma.account.createMany({
    data: accounts,
  });
}

async function createCompany() {
  await prisma.company.createMany({
    data: companies,
  });
}

async function createCompanyKYC() {
  await prisma.companyKYC.createMany({
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

async function createAdmin() {
  await prisma.admin.createMany({
    data: admins,
  });
}

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

async function createInvitation() {
  await prisma.invitation.createMany({
    data: invitations,
  });
}

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

async function createVoucherCertificate() {
  await prisma.voucherCertificate.createMany({
    data: voucherCertificates,
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

async function createAssociateLineItem() {
  await prisma.associateLineItem.createMany({
    data: associateLineItems,
  });
}

async function createAssociateVoucher() {
  await prisma.associateVoucher.createMany({
    data: associateVouchers,
  });
}

async function createEvent() {
  await prisma.event.createMany({
    data: event,
  });
}

async function createAsset() {
  await prisma.asset.createMany({
    data: assets,
  });
}

async function createAssetVoucher() {
  await prisma.assetVoucher.createMany({
    data: assetVouchers,
  });
}

async function createCounterparty() {
  await prisma.counterparty.createMany({
    data: counterpartys,
  });
}

async function createAccountingSetting() {
  await prisma.accountingSetting.createMany({
    data: accountingSettings,
  });
}

async function createUserSetting() {
  await prisma.userSetting.createMany({
    data: userSettings,
  });
}

async function createCompanySetting() {
  await prisma.companySetting.createMany({
    data: companySettings,
  });
}

async function createUserActionLog() {
  await prisma.userActionLog.createMany({
    data: userActionLogs,
  });
}

async function createInvoice() {
  await prisma.invoice.createMany({
    data: invoice,
  });
}

async function createTPlan() {
  await Promise.all(
    tPlans.map(async (plan) => {
      const createdPlan = await prisma.tPlan.create({
        data: {
          type: plan.type as TPlanType,
          planName: plan.planName,
          price: plan.price,
          extraMemberPrice: plan.extraMemberPrice || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // 插入 Feature 資料
      if (plan.features) {
        await prisma.tPlanFeature.createMany({
          data: plan.features.map((feature) => ({
            planId: createdPlan.id,
            featureKey: feature.featureKey,
            featureValue: Array.isArray(feature.featureValue)
              ? JSON.stringify(feature.featureValue)
              : feature.featureValue,
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
        });
      }
    })
  );
}

async function main() {
  try {
    await createFile();
    await createCompany();
    await new Promise((resolve) => {
      setTimeout(resolve, 3000);
    });
    await new Promise((resolve) => {
      setTimeout(resolve, 3000);
    });
    await createUser();
    await createCounterparty();
    await createUserActionLog();
    await createAccountingSetting();
    await createCompanySetting();
    await createUserSetting();
    await createRole();
    await createCompanyKYC();
    await createAccount();
    await createAdmin();
    await createDepartment();
    await createEmployee();
    await createProjects();
    await createSale();
    await createValue();
    await createEmployeeProject();
    await createWorkRate();
    await createPlan();
    await createTPlan();
    await createOrder();
    await createPaymentRecord();
    await createSubscription();
    await createInvitation();
    await new Promise((resolve) => {
      setTimeout(resolve, 5000);
    });
    await createIncomeExpenses();
    await new Promise((resolve) => {
      setTimeout(resolve, 3000);
    });
    await createMilestones();
    await new Promise((resolve) => {
      setTimeout(resolve, 3000);
    });

    // Info (20240316 - Murky) - Uncomment this line to seed generated reports
    // await createGeneratedReports();
    await new Promise((resolve) => {
      setTimeout(resolve, 3000);
    });
    await createPendingReports();
    await new Promise((resolve) => {
      setTimeout(resolve, 3000);
    });

    await createJournal();
    await createCertificate();
    await createVoucher();
    await createVoucherCertificate();
    await createAsset();

    await new Promise((resolve) => {
      setTimeout(resolve, 3000);
    });
    await createLineItems();
    await createSalaryRecord();
    await createVoucherSalaryRecordFolder();
    await createAssetVoucher();

    await createEvent();
    await createAssociateVoucher();
    await createAssociateLineItem();
    await createInvoice();
  } finally {
    await prisma.$disconnect();
  }
}

main();
