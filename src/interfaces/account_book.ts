import { IAccountBookNode, IAccountBookNodeJSON } from '@/interfaces/account_book_node';
import { ILineItemEntity } from '@/interfaces/line_item';

/* Info: (20241117 - Luphia)
 * 設計一個 Account Book 的資料結構，參考 N-ary Tree 的架構
 * 具備 nodes 屬性，以 Map 的方式儲存所有節點，key 為節點的 id，value 為節點本身
 * 具備 toJSON 方法，將樹狀結構轉換為 JSON 格式，可帶入 filter 來篩選需要的屬性，可產出 Trial Balance 要的資料
 * 具備 toLedgerJSON 方法，將樹狀結構轉換為 Ledger JSON 格式，可帶入 filter 來篩選需要的屬性
 * 具備 findNode 方法，用來尋找特定的節點
 * 具備 findNodes 方法，用來尋找特定的節點，並回傳所有符合條件的節點
 * 具備 insertNode 方法，用來插入新的節點
 * 具備 deleteNode 方法，用來刪除特定的節點
 * 具備 addDate 方法，用來更新特定的節點
 * 具備 traverse 方法，用來遍歷整個樹狀結構
 */
export interface IAccountBook {
  nodes: Map<number, IAccountBookNode>;
  toJSON(): IAccountBookNodeJSON[];
  findNode(id: number): IAccountBookNode | null;
  findNodes(filter: (node: IAccountBookNode) => boolean): IAccountBookNode[];
  insertNode(node: IAccountBookNode): void;
  deleteNode(id: number): void;
  addData(data: ILineItemEntity): void;
  traverse(callback: (node: IAccountBookNode) => void): void;
}
