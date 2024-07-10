import { OPERATING_CASH_FLOW_INDIRECT_MAPPING } from "@/constants/operating_cash_flow";
import { IOperatingCashFlowMapping } from "@/interfaces/cash_flow";
import { IAccountForSheetDisplay, IAccountNode } from '@/interfaces/accounting_account';
// import { AccountSheetType } from "@/constants/account";
// import { getAllLineItemsByAccountSheet } from ".";

function mergeMap(
    balanceSheetMap: Map<string, IAccountNode>,
    incomeStatementMap: Map<string, IAccountNode>
): Map<string, IAccountNode> {
    const mergedMap = new Map<string, IAccountNode>([...balanceSheetMap, ...incomeStatementMap]);
    return mergedMap;
}

function generateIndirectOperatingCashFlowRecursive(
    referenceMap: Map<string, IAccountNode>,
    currentCode: string,
    level: number,
    node: IOperatingCashFlowMapping
): Map<string, IAccountForSheetDisplay> {
    // DFS
    let childMap = new Map<string, IAccountForSheetDisplay>();
    node.child?.forEach((value, key) => {
        const childAccountForSheet = generateIndirectOperatingCashFlowRecursive(referenceMap, key, level + 1, value);
        childMap = new Map([...childMap, ...childAccountForSheet]);
    });

    const { fromCode, name, debit, operatingFunction } = node;

    let amount = fromCode.reduce((acc, code) => {
        const account = referenceMap.get(code);
        if (account) {
            const isAccountDebit = account.debit;
            const accountAmount = debit !== isAccountDebit ? -account.amount : account.amount;
            return operatingFunction(acc, accountAmount);
        }
        return acc;
    }, 0);

    childMap.forEach((value) => {
        if (value.amount) {
            amount = operatingFunction(amount, value.amount);
        }
    });

    const accountForSheetDisplay: IAccountForSheetDisplay = {
        code: currentCode,
        name,
        amount,
        indent: level,
        debit,
    };

    const newAccountSheetMapping = new Map<string, IAccountForSheetDisplay>(
        [...childMap, [currentCode, accountForSheetDisplay]]
    );
    return newAccountSheetMapping;
}

function generateIndirectOperatingCashFlow(
    referenceMap: Map<string, IAccountNode>,
): Map<string, IAccountForSheetDisplay> {
    let accountSheetMap = new Map<string, IAccountForSheetDisplay>();

    OPERATING_CASH_FLOW_INDIRECT_MAPPING.forEach((value, key) => {
        const childMap = generateIndirectOperatingCashFlowRecursive(referenceMap, key, 0, value);
        accountSheetMap = new Map([...accountSheetMap, ...childMap]);
    });
    return accountSheetMap;
}

export function getIndirectOperatingCashFlow(
    balanceSheetMap: Map<string, IAccountNode>,
    incomeStatementMap: Map<string, IAccountNode>
) {
    const mergedMap = mergeMap(balanceSheetMap, incomeStatementMap);
    const indirectOperatingCashFlow = generateIndirectOperatingCashFlow(mergedMap);

    // ToDo: (20240710 - Murky) 現在暫時用Map內的順序，之後需要用DevTool的表格排序
    return indirectOperatingCashFlow;
}

// export async function generateCashFlow(
//     companyId,
//     startDateInSecond,
//     endDateInSecond,
// ) {
//     const bsLineItemsFromDB = await getAllLineItemsByAccountSheet(
//         companyId,
//         startDateInSecond,
//         endDateInSecond,
//         AccountSheetType.BALANCE_SHEET
//     );

//     const ciLineItemsFromDB = await getAllLineItemsByAccountSheet(
//         companyId,
//         startDateInSecond,
//         endDateInSecond,
//         AccountSheetType.INCOME_STATEMENT
//     );
// }
