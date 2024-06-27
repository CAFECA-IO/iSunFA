import { Node } from "@/account/node";
import { MISSING_CODE_MARKERS } from "@/constants/account";

function countLeadingSpaces(str: string) {
  // Info: (20240625 - Murky) 資料內有全形空格
  // eslint-disable-next-line no-irregular-whitespace
  const spaceCount = str.search(/\S/);
  return spaceCount;
}

export function buildAccountTree(records: string[][]): Node {
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

  function assignMissingCode(node: Node, depth: number): string {
    node.children.forEach((child) => assignMissingCode(child, depth + 1));

    if (node.code.length > 0) {
      return node.code;
    }

    const childCode = assignMissingCode(node.children[0], depth + 1);
    const code = `${childCode.slice(0, 4)}${MISSING_CODE_MARKERS[depth]}`;

    // Info: (20240625 - Murky) I need to change the code from original node
    // eslint-disable-next-line no-param-reassign
    node.code = code;

    return childCode;
  }

  createNode(root, -1);
  assignMissingCode(root, 0);
  return root;
}
