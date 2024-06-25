import { parse } from 'csv-parse';
import path from 'path';
import fs from 'fs';

class Node {
  accountId: string;

  accountCName: string;

  accountEName: string;

  elementId: string;

  children: Node[] = [];

  constructor(accountId: string, accountCName: string, accountEName: string, elementId: string) {
    this.accountId = accountId;
    this.accountCName = accountCName;
    this.accountEName = accountEName;
    this.elementId = elementId;
  }
}

function countLeadingSpaces(str: string) {
  // Info: (20240625 - Murky) 資料內有全形空格
  // eslint-disable-next-line no-irregular-whitespace
  const match = str.match(/^[　 ] */);
  return match ? match[0].length : 0;
}

function buildTree(records: string[][]) {
  const root = new Node('', '', '', '');
  const maxLength = records.length;
  let counter = 1;
  function dfs(node: Node, currentLeadingSpaces: number) {
    while (counter < maxLength) {
      const currentLine = records[counter];
      const currentLineLeadingSpaces = countLeadingSpaces(currentLine[7]);

      if (currentLineLeadingSpaces <= currentLeadingSpaces) {
        return;
      }

      const child = new Node(currentLine[6], currentLine[7], currentLine[8], currentLine[9]);
      node.children.push(child);

      counter += 1;
      dfs(child, currentLineLeadingSpaces);
    }
  }

  dfs(root, -1);
  return root;
}

function saveTreeToJson(tree: Node, filePath: string) {
  fs.writeFileSync(filePath, JSON.stringify(tree, Object.keys(tree).sort(), 2));
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
const jsonPath = path.resolve(__dirname, 'account.json');
parseCSV(csvPath)
  // Info: (20240625 - Murky) data 是 string[][], 但是用promise的時候typescript偵測不到type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .then((data: any) => {
      const tree = buildTree(data);
      return tree;
  })
  .then((tree: Node) => {
      saveTreeToJson(tree, jsonPath);
  })
  .catch((err) => {
    // Debug: (20240625 - Murky) Debug
    // eslint-disable-next-line no-console
    console.error(err);
});
