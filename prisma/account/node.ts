export class Node {
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
