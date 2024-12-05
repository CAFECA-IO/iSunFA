import { IPFS_HOST_IP } from '@/constants/config';
import { unixfs, type UnixFS } from '@helia/unixfs';
import type { Libp2p, ServiceMap } from '@libp2p/interface';
import { HeliaLibp2p } from 'helia';
// eslint-disable-next-line import/no-extraneous-dependencies
import { CID } from 'multiformats/cid';

export class UnixFsSingleton {
  private static instance: UnixFsSingleton;

  private unixFs: UnixFS | null = null;

  private constructor(private helia: HeliaLibp2p<Libp2p<ServiceMap>>) {}

  public static async getInstance(
    helia: HeliaLibp2p<Libp2p<ServiceMap>>
  ): Promise<UnixFsSingleton> {
    if (!UnixFsSingleton.instance) {
      UnixFsSingleton.instance = new UnixFsSingleton(helia);
      await UnixFsSingleton.instance.initUnixFs();
    }

    return UnixFsSingleton.instance;
  }

  private static async reconstructAsyncIterator<T>(iterator: AsyncIterable<T>): Promise<T[]> {
    /**
     * Info: (20241205 - Murky)
     * @type {AsyncIterator<T>} iter 異步迭代器
     * @note
     * - Symbol.asyncIterator 是 JavaScript 提供的一個特殊屬性，用來定義對象的異步迭代行為。
     * - 在這裡，iterator[Symbol.asyncIterator]() 返回該對象的異步迭代器。
     * - 調用 .next() 方法可以獲取迭代器的下一個值，該方法返回一個 Promise，解構後可以獲得 { value, done }。
     */
    const asyncIterator = iterator[Symbol.asyncIterator]();
    const collectValues = async (iter: AsyncIterator<T>, acc: T[]): Promise<T[]> => {
      const { value, done } = await iter.next(); // Info: (20241205 - Murky) 在遞歸中等待
      if (done) {
        return acc; // Info: (20241205 - Murky) 終止條件：迭代完成
      }
      return collectValues(iter, [...acc, value]); // Info: (20241205 - Murky) 遞歸處理下一個值
    };
    return collectValues(asyncIterator, []);
  }

  private async initUnixFs() {
    if (!this.unixFs) {
      this.unixFs = unixfs(this.helia);
    }
    return this.unixFs;
  }

  public async uploadFile(options: { fileBuffer: Buffer; fileName: string }) {
    const { fileBuffer, fileName } = options;
    if (!this.unixFs) {
      throw new Error('UnixFs is not initialized');
    }
    const emptyDirCid = await this.unixFs.addDirectory();
    const fileCid = await this.unixFs.addBytes(new Uint8Array(fileBuffer));
    const updateDirCid = await this.unixFs.cp(fileCid, emptyDirCid, fileName);
    return updateDirCid;
  }

  public async pin(cid: string | CID) {
    if (!this.unixFs) {
      throw new Error('UnixFs is not initialized');
    }
    const cidObj = typeof cid === 'string' ? CID.parse(cid) : cid;
    const result = await fetch(
      `http://${IPFS_HOST_IP}:5001/api/v0/pin/add?arg=${cidObj.toString()}`,
      {
        method: 'POST',
      }
    );
    const pinResult = await result.json();
    return pinResult;
  }

  public async cat(cid: string | CID) {
    if (!this.unixFs) {
      throw new Error('UnixFs is not initialized');
    }
    const cidObj = typeof cid === 'string' ? CID.parse(cid) : cid;

    // Info: (20241205 - Murky) 將所有 chunks 合併成一個 Buffer
    const chunks: Uint8Array[] = await UnixFsSingleton.reconstructAsyncIterator(
      this.unixFs.cat(cidObj)
    );
    const imageBuffer = Buffer.concat(chunks);
    return imageBuffer;
  }
}
