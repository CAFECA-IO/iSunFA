import prisma from '@/client';

export async function getWorkRatesByCompanyId(accountBookId: number, date: number) {
  const workRates = await prisma.workRate.findMany({
    where: {
      createdAt: {
        lte: date,
      },
      employeeProject: {
        project: {
          accountBookId,
        },
      },
    },
    select: {
      employeeProjectId: true,
      actualHours: true,
      createdAt: true,
      employeeProject: {
        select: {
          employeeId: true,
          projectId: true,
          project: {
            select: {
              accountBookId: true,
              name: true,
            },
          },
        },
      },
    },
  });
  return workRates;
}

export async function getSalaryRecords(date: number) {
  const salaryRecordsResult = await prisma.salaryRecord.findMany({
    where: {
      createdAt: {
        lte: date,
      },
    },
    select: {
      employeeId: true,
      salary: true,
      insurancePayment: true,
      bonus: true,
      createdAt: true,
    },
  });
  const salaryRecords = salaryRecordsResult.map((sr) => {
    return {
      employee_id: sr.employeeId,
      total_payment: sr.salary + sr.insurancePayment + sr.bonus,
      created_at: sr.createdAt,
    };
  });
  return salaryRecords;
}
