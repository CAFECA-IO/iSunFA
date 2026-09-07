// Info: (20260824 - Emily) 表號量尺的測試(#6710)。兩個護欄各對應一次 08-24 的真實誤報。

import { scanTableNumbers } from "@/lib/utils/table_number_scan";

describe("scanTableNumbers", () => {
  it("掃出基本表號並去重、依編號排序", () => {
    const text = "見表3.6 與表2.1;表3.6 再次出現;另見表2.10 與表2.9。";
    expect(scanTableNumbers(text)).toEqual(["2.1", "2.9", "2.10", "3.6"]);
  });

  it("護欄一:「管理表 6.0.4」是版本號,不是表6.0(08-24 原檔實測 20 處誤報)", () => {
    const text = "係數引自環境部溫室氣體排放係數管理表 6.0.4 版。";
    expect(scanTableNumbers(text)).toEqual([]);
  });

  it("護欄二:第三段之後還有數字的整串放掉,不截前綴", () => {
    expect(scanTableNumbers("版本 表 6.0.4.1 之標示")).toEqual([]);
  });

  it("全形數字、全形句點、表字後空白都正規化(不依賴呼叫端先 NFKC)", () => {
    const text = "表 ２．１ 與表　３.８";
    expect(scanTableNumbers(text)).toEqual(["2.1", "3.8"]);
  });

  it("兩段式表號(表3.6.1)收得進來,單一數字(統計表 3)不收", () => {
    const text = "表3.6.1 為表3.6 之細分;另有統計表 3 份。";
    expect(scanTableNumbers(text)).toEqual(["3.6", "3.6.1"]);
  });
});
