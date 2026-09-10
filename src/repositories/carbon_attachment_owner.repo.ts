// Info: (20260907 - Emily) 附件 cid 擁有者 Repository(#6748):唯一可觸 CarbonAttachmentOwner 表的層級
import { prisma } from "@/lib/prisma";
import { canonicalizeAddressForKey } from "@/lib/team/address_identity";

export const carbonAttachmentOwnerRepo = {
  /**
   * Info: (20260907 - Emily) 上傳成功後記一筆。同一個 cid 重複上傳(Laria 的 metadata hash
   * 由內容決定,同檔同 cid)不改擁有者:第一個上傳的人是擁有者,後來者只是又上傳了一份同內容的檔。
   * 這是刻意的 —— 若改成「最後上傳者」,知道別人 cid 的人重傳一份同內容的檔就能把歸屬搶過來。
   */
  async recordOwner(cid: string, address: string): Promise<void> {
    await prisma.carbonAttachmentOwner.upsert({
      where: { cid },
      create: { cid, address: canonicalizeAddressForKey(address) },
      update: {},
    });
  },

  async findOwnerAddress(cid: string): Promise<string | null> {
    const record = await prisma.carbonAttachmentOwner.findUnique({
      where: { cid },
      select: { address: true },
    });
    return record?.address ?? null;
  },
};
