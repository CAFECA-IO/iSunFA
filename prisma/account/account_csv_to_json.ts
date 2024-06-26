// ToDo (20240625 - Murky): This file is too messy and unclean, need to refactor
// Info (20240625 - Murky): Two class for different purpose
/* eslint-disable max-classes-per-file */
import { parse } from 'csv-parse';
import path from 'path';
import fs from 'fs';
import { PUBLIC_COMPANY_ID } from '../../src/constants/company';

class Node {
  code: string;

  accountCName: string;

  accountEName: string;

  elementId: string;

  children: Node[] = [];

  constructor(code: string, accountCName: string, accountEName: string, elementId: string) {
    this.code = code;
    this.accountCName = accountCName;
    this.accountEName = accountEName;
    this.elementId = elementId;
  }
}

function countLeadingSpaces(str: string) {
  // Info: (20240625 - Murky) 資料內有全形空格
  // eslint-disable-next-line no-irregular-whitespace
  const spaceCount = str.search(/\S/);
  return spaceCount;
}

function buildTree(records: string[][]) {
  const root = new Node('', '', '', '');
  const maxLength = records.length;
  let counter = 1;

  function createNode(node: Node, currentLeadingSpaces: number) {
    while (counter < maxLength) {
      const currentLine = records[counter];
      const currentLineLeadingSpaces = countLeadingSpaces(currentLine[7]);

      if (currentLineLeadingSpaces <= currentLeadingSpaces) {
        return;
      }

      const child = new Node(currentLine[6], currentLine[7], currentLine[8], currentLine[9]);
      node.children.push(child);

      counter += 1;
      createNode(child, currentLineLeadingSpaces);
    }
  }

  createNode(root, -1);

  const symbolByDeep = ['!', '@', '#', '$', '%'];
  function createMissingCode(node: Node, depth: number): string {
    node.children.forEach((child) => createMissingCode(child, depth + 1));
    if (node.code.length > 0) {
      return node.code;
    }

    const childCode = createMissingCode(node.children[0], depth + 1);
    const code = `${symbolByDeep[depth]}${childCode}`;

    // eslint-disable-next-line no-param-reassign
    node.code = code;

    return childCode;
  }

  createMissingCode(root, 0);
  return root;
}

// Create array of elements
class AccountElement {
  companyId: number = PUBLIC_COMPANY_ID;

  system: string = "IFRS";

  type: string;

  debit: boolean;

  liquidity: boolean;

  code: string;

  name: string;

  forUser: boolean;

  parentCode: string;

  rootCode: string;

  createdAt: number = 0;

  updatedAt: number = 0;

  constructor(type: string, debit: boolean, liquidity: boolean, code: string, name: string, forUser: boolean, parentCode: string, rootCode: string) {
    this.type = type;
    this.debit = debit;
    this.liquidity = liquidity;
    this.code = code;
    this.name = name;
    this.forUser = forUser;
    this.parentCode = parentCode;
    this.rootCode = rootCode;
  }
}

// Info: (20240625 - Murky) 這個部分是要把資料轉成accountElement的array
function determineTypeDebitLiquidity(node: Node, parentType: string | null, parentDebit: boolean | null, parentLiquidity: boolean | null) {
  let category = 'other';
  const currentCode = node.code;
  const currentEName = node.accountEName.toLowerCase();

  // if currentCode Start with alphabet
  if (currentCode.match(/^[A-Z]/)) {
    if (currentCode.length <= 5) {
      category = 'changeInEquity';
    } else {
      category = 'cashFlow';
    }
  } else if (currentEName.includes("comprehensive")) {
    category = 'otherComprehensiveIncome';
  } else if (currentEName.includes("gain") || currentEName.includes("loss") || currentEName.includes("profit")) {
    const indexOfGain = currentEName.indexOf("gain");
    const indexOfLoss = currentEName.indexOf("loss");
    if (indexOfGain !== -1 && indexOfLoss !== -1) {
      if (indexOfGain < indexOfLoss) {
        category = 'gain';
      } else {
        category = 'loss';
      }
    } else if (indexOfGain !== -1) {
      category = 'gain';
    } else if (indexOfLoss !== -1) {
      category = 'loss';
    } else {
      category = 'profit';
    }
  } else if (currentEName.includes("income")) {
    category = 'income';
  } else if (currentEName.includes("expense")) {
    category = 'expense';
  } else if (currentEName.includes("cost")) {
    category = 'cost';
  } else if (currentEName.includes("revenue")) {
    category = 'revenue';
  } else if (currentEName.includes("equity") !== currentEName.includes("liability")) {
    if (currentEName.includes("equity")) {
      category = 'equity';
    } else if (currentEName.includes("non-current")) {
        category = 'nonCurrentLiability';
      } else {
        category = 'currentLiability';
      }
  } else if (currentEName.includes("asset")) {
    if (currentEName.includes("non-current")) {
      category = 'nonCurrentAsset';
    } else {
      category = 'currentAsset';
    }
  } else {
    category = 'other';
  }

  let type: string;
  let debit: boolean;
  let liquidity: boolean;
  switch (category) {
    case 'changeInEquity':
      type = parentType || 'changeInEquity';
      debit = (typeof parentDebit === 'boolean') ? parentDebit : false;
      liquidity = (typeof parentLiquidity === 'boolean') ? parentLiquidity : true;
      break;
    case 'cashFlow':
      type = parentType || 'cashFlow';
      debit = (typeof parentDebit === 'boolean') ? parentDebit : false;
      liquidity = (typeof parentLiquidity === 'boolean') ? parentLiquidity : true;
      break;
    case 'otherComprehensiveIncome':
      type = parentType || 'otherComprehensiveIncome';
      debit = (typeof parentDebit === 'boolean') ? parentDebit : false;
      liquidity = (typeof parentLiquidity === 'boolean') ? parentLiquidity : true;
      break;
    case 'gain':
      type = parentType || 'gainOrLoss';
      debit = (typeof parentDebit === 'boolean') ? parentDebit : false;
      liquidity = (typeof parentLiquidity === 'boolean') ? parentLiquidity : true;
      break;
    case 'loss':
      type = parentType || 'gainOrLoss';
      debit = (typeof parentDebit === 'boolean') ? parentDebit : true;
      liquidity = (typeof parentLiquidity === 'boolean') ? parentLiquidity : true;
      break;
    case 'profit':
      type = parentType || 'gainOrLoss';
      debit = (typeof parentDebit === 'boolean') ? parentDebit : false;
      liquidity = (typeof parentLiquidity === 'boolean') ? parentLiquidity : true;
      break;
    case 'income':
      type = parentType || 'income';
      debit = (typeof parentDebit === 'boolean') ? parentDebit : false;
      liquidity = (typeof parentLiquidity === 'boolean') ? parentLiquidity : true;
      break;
    case 'expense':
      type = parentType || 'expense';
      debit = (typeof parentDebit === 'boolean') ? parentDebit : true;
      liquidity = (typeof parentLiquidity === 'boolean') ? parentLiquidity : true;
      break;
    case 'cost':
      type = parentType || 'cost';
      debit = (typeof parentDebit === 'boolean') ? parentDebit : true;
      liquidity = (typeof parentLiquidity === 'boolean') ? parentLiquidity : true;
      break;
    case 'revenue':
      type = parentType || 'revenue';
      debit = (typeof parentDebit === 'boolean') ? parentDebit : false;
      liquidity = (typeof parentLiquidity === 'boolean') ? parentLiquidity : true;
      break;
    case 'equity':
      type = parentType || 'equity';
      debit = (typeof parentDebit === 'boolean') ? parentDebit : false;
      liquidity = (typeof parentLiquidity === 'boolean') ? parentLiquidity : false;
      break;
    case 'nonCurrentLiability':
      type = parentType || 'liability';
      debit = (typeof parentDebit === 'boolean') ? parentDebit : false;
      liquidity = (typeof parentLiquidity === 'boolean') ? parentLiquidity : false;
      break;
    case 'currentLiability':
      type = parentType || 'liability';
      debit = (typeof parentDebit === 'boolean') ? parentDebit : false;
      liquidity = (typeof parentLiquidity === 'boolean') ? parentLiquidity : true;
      break;
    case 'nonCurrentAsset':
      type = parentType || 'asset';
      debit = (typeof parentDebit === 'boolean') ? parentDebit : true;
      liquidity = (typeof parentLiquidity === 'boolean') ? parentLiquidity : false;
      break;
    case 'currentAsset':
      type = parentType || 'asset';
      debit = (typeof parentDebit === 'boolean') ? parentDebit : true;
      liquidity = (typeof parentLiquidity === 'boolean') ? parentLiquidity : true;
      break;
    default:
      type = parentType || 'other';
      debit = (typeof parentDebit === 'boolean') ? parentDebit : true;
      liquidity = (typeof parentLiquidity === 'boolean') ? parentLiquidity : true;
      break;
  }
  return { type, debit, liquidity };
}

function isForUser(node: Node, type: string) {
  const allowTypes = ['asset', 'liability', 'equity', 'revenue', 'cost', 'income', 'expense', 'gainOrLoss', 'otherComprehensiveIncome'];
  if (node.children.length > 0 && allowTypes.includes(type)) {
    return true;
  }
  return false;
}

function createAccountElementsForSeeder(rootNode: Node) {
  const accountsForSeeder: AccountElement[] = [];

  const codeSet = new Set<string>();
  function createAccountElement(node: Node, parent: Node, root: Node, parentType: string | null, parentDebit: boolean | null, parentLiquidity: boolean | null) {
    const { type, debit, liquidity } = determineTypeDebitLiquidity(node, parentType, parentDebit, parentLiquidity);
    const forUser = isForUser(node, type);
    const account = new AccountElement(
      type,
      debit,
      liquidity,
      node.code,
      node.accountCName,
      forUser,
      parent.code,
      root.code,
    );
    if (!codeSet.has(account.code)) {
      accountsForSeeder.push(account);
      codeSet.add(account.code);
    }

    node.children.forEach((child) => createAccountElement(child, node, root, type, debit, liquidity));
  }

  rootNode.children.forEach((child) => createAccountElement(child, rootNode, rootNode, null, null, null));

  // help me check if any code is duplicated
  const doubleCheck = new Set<string>();
  accountsForSeeder.forEach((account) => {
    if (doubleCheck.has(account.code)) {
      // eslint-disable-next-line no-console
      console.log(`Duplicated code: ${account.code}`);
    }
    doubleCheck.add(account.code);
  });
  return accountsForSeeder;
}

function saveTreeToJson(tree: Node, filePath: string) {
  fs.writeFileSync(filePath, JSON.stringify(tree, Object.keys(tree).sort(), 2));
}

function saveAccountElementsToJson(accountElements: AccountElement[], filePath: string) {
  fs.writeFileSync(filePath, JSON.stringify(accountElements, null, 2));
}

function parseCSV(filePath: string) {
  return new Promise((resolve, reject) => {
    const records: string[][] = [];
    fs.createReadStream(filePath)
      .pipe(parse({
        encoding: 'utf8',
        delimiter: ',',
        trim: false,
        skip_empty_lines: true,
      }))
      .on('data', (data) => records.push(data))
      .on('end', () => resolve(records))
      .on('error', (err) => reject(err));
  });
}

const csvPath = path.resolve(__dirname, '一般個別中英文會計科目對照.csv');
const treeJsonPath = path.resolve(__dirname, 'account_tree.json');
const accountElementsJsonPath = path.resolve(__dirname, '../seed_json/account.json');
parseCSV(csvPath)
  // Info: (20240625 - Murky) data 是 string[][], 但是用promise的時候typescript偵測不到type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .then((data: any) => {
      const tree = buildTree(data);
      return tree;
  })
  .then((tree: Node) => {
      saveTreeToJson(tree, treeJsonPath);
      const accountElements = createAccountElementsForSeeder(tree);
      return accountElements;
  })
  .then((accountElements: AccountElement[]) => {
      saveAccountElementsToJson(accountElements, accountElementsJsonPath);
  })
  .catch((err) => {
    // Debug: (20240625 - Murky) Debug
    // eslint-disable-next-line no-console
    console.error(err);
});
