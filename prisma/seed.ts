import { PrismaClient } from '@prisma/client';
import accounts from '@/seed_json/account.json';
import companies from '@/seed_json/company.json';
import admin from '@/seed_json/admin.json';
import projects from '@/seed_json/project.json';
import IncomeExpenses from '@/seed_json/income_expense.json';
import roles from '@/seed_json/role.json';
import user from '@/seed_json/user.json';
import milestones from '@/seed_json/milestone.json';
import generatedReports from '@/seed_json/generated_report.json';
import pendingReports from '@/seed_json/pending_report.json';
import departments from '@/seed_json/department.json';
import employees from '@/seed_json/employee.json';
import employeeProjects from '@/seed_json/employee_project.json';
import values from '@/seed_json/value.json';
import sales from '@/seed_json/sale.json';
import workRates from '@/seed_json/work_rate.json';

const prisma = new PrismaClient();

async function createMilestones() {
  await prisma.milestone.createMany({
    data: milestones,
  });
}

async function createGeneratedReports() {
  await prisma.report.createMany({
    data: generatedReports,
  });
}

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
  await prisma.user.create({
    data: user,
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

async function createAdmin() {
  await prisma.admin.create({
    data: admin,
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

async function main() {
  // Todo: Murky will modify createAccount seed data and uncomment related codes (20240611 - Gibbs)
  await createRole();
  await createUser();
  await createCompany();
  await createAccount();
  await createAdmin();
  await createDepartment();
  await createEmployee();
  await createProjects();
  await createSale();
  await createValue();
  await createEmployeeProject();
  await createWorkRate();
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
