import prisma from '@/client';
import { ProgressStatus } from '@/constants/account';
import { ReportSheetType, ReportType } from '@/constants/report';
import { IAccountForSheetDisplay } from '@/interfaces/accounting_account';
import { Report } from '@prisma/client';
import { getTimestampNow } from '@/lib/utils/common';
import { assertIsIAccountForSheetDisplayArray } from '@/lib/utils/type_guard/account';
import { assertIsReportSheetType } from '@/lib/utils/type_guard/report';

export async function findFirstReportByFromTo(
    companyId: number,
    fromInSecond: number,
    toInSecond: number,
    reportSheetType: ReportSheetType,
) {
    let report:Report | null = null;

    try {
        report = await prisma.report.findFirst({
            where: {
                companyId,
                from: fromInSecond,
                to: toInSecond,
                reportType: reportSheetType,
            },
        });
    } catch (error) {
        // Deprecate: (20240710 - Murky) Debugging perpose
        // eslint-disable-next-line no-console
        console.error(error);
    }

    return report;
}

export async function findUniqueReportById(reportId: number) {
    let report: Report | null = null;

    try {
       report = await prisma.report.findUnique({
            where: {
                id: reportId,
            },
        });
    } catch (error) {
        report = null;
        // Deprecate: (20240710 - Murky) Debugging perpose
        // eslint-disable-next-line no-console
        console.error(error);
    }

    return report;
}

export async function getReportIdByFromTo(
    companyId: number,
    fromInSecond: number,
    toInSecond: number,
    reportSheetType: ReportSheetType,
) {
    let report: { id: number } | null = null;

    try {
        report = await prisma.report.findFirst({
            where: {
                companyId,
                from: fromInSecond,
                to: toInSecond,
                reportType: reportSheetType,
            },
            select: {
                id: true,
            }
        });
    } catch (error) {
        // Deprecate: (20240710 - Murky) Debugging perpose
        // eslint-disable-next-line no-console
        console.error(error);
    }

    return report?.id;
}

export async function createReport(
    companyId: number,
    projectId: number | null,
    name: string,
    fromInSecond: number,
    toInSecond: number,
    reportType: ReportType,
    reportSheetType: ReportSheetType,
    content: IAccountForSheetDisplay[],
    status: ProgressStatus,
) {
    const nowInSecond = getTimestampNow();
    let report: Report | null = null;

    try {
        report = await prisma.report.create({
            data: {
                companyId,
                projectId,
                name,
                from: fromInSecond,
                to: toInSecond,
                type: reportType,
                reportType: reportSheetType,
                content: JSON.stringify(content),
                status,
                createdAt: nowInSecond,
                updatedAt: nowInSecond,
            },
        });
    } catch (error) {
        // Deprecate: (20240710 - Murky) Debugging purpose
        // eslint-disable-next-line no-console
        console.error(error);
    }

    return report;
}
