import { PrismaClient } from '@prisma/client';
import accounts from '@/seed_json/account.json';
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
import subscriptions from '@/seed_json/subscription.json';
import orders from '@/seed_json/order.json';
import paymentRecords from '@/seed_json/payment_record.json';
import invitations from '@/seed_json/invitation.json';
import clients from '@/seed_json/client.json';
import journals from '@/seed_json/journal.json';
import vouchers from '@/seed_json/voucher.json';
import lineItems from '@/seed_json/line_item.json';
import salaryRecords from '@/seed_json/salary_record.json';
import voucherSalaryRecordFolder from '@/seed_json/voucher_salary_record_folder.json';

const prisma = new PrismaClient();

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

// Info (2024722 - Murky) - Uncomment this line to seed generated reports
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

async function createClient() {
  await prisma.client.createMany({
    data: clients,
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

async function createLineItem(lineItem: {
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
  await prisma.lineItem.create({
    data: {
      amount: lineItem.amount,
      description: lineItem.description,
      debit: lineItem.debit,
      createdAt: lineItem.createdAt,
      updatedAt: lineItem.updatedAt,
      account: {
        connect: {
          id: account.id,
        },
      },
      voucher: {
        connect: {
          id: lineItem.voucherId,
        },
      },
    },
  });
}

async function createLineItems() {
  await Promise.all(lineItems.map((lineItem) => createLineItem(lineItem)));
}

async function main() {
  await createRole();
  await createUser();
  await createCompany();
  await createCompanyKYC();
  await createClient();
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
  await createVoucher();

  await new Promise((resolve) => {
    setTimeout(resolve, 3000);
  });
  await createLineItems();
  await createSalaryRecord();
  await createVoucherSalaryRecordFolder();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async () => {
    // Info (20240316 - Murky) - disconnect prisma
    // Todo: (20240822 - Murky Anna) 使用 logger
    await prisma.$disconnect();
    process.exit(1);
  });
