export enum AssetStatus {
  SCRAPPED = 'scrapped',
  SOLD = 'sold',
  DONATED = 'donated',
  MISSING = 'missing',
  NORMAL = 'normal',
}

/**
 * Info: (20241024 - Murky)
 * @description Asset type that is based on property, plant, equipment
 * @note value is Account Code of asset
 * @shirley 目前我只有寫一個type，不確定要有哪些type
 */
export enum AssetEntityType {
  LAND = '1602',
}

/**
 * Info: (20241024 - Murky)
 * @description How Asset is depreciated, used in Asset table `depreciationMethod`
 * @Shirley 目前我只有寫一個type，可以增加更多
 */
export enum AssetDepreciationMethod {
  /**
   * Info: (20241024 - Murky)
   * @description 直線法
   */
  STRAIGHT_LINE = 'straight_line',
  // DOUBLE_DECLINING = 'double_declining',
  // UNITS_OF_PRODUCTION = 'units_of_production',
}

export const AccountCodesOfAsset = [
  '1602', // Info: (20241007 - Julian) 土地成本
  '1606', // Info: (20241007 - Julian) 土地改良物成本
  '1611', // Info: (20241007 - Julian) 房屋及建築成本
  '1616', // Info: (20241007 - Julian) 機器設備成本
  '1621', // Info: (20241007 - Julian) 裝卸設備成本
  '1626', // Info: (20241007 - Julian) 倉儲設備成本
  '1631', // Info: (20241007 - Julian) 售氣及輸氣設備成本
  '1636', // Info: (20241007 - Julian) 模具設備成本
  '1641', // Info: (20241007 - Julian) 水電設備成本
  '1646', // Info: (20241007 - Julian) 冷凍設備成本
  '1651', // Info: (20241007 - Julian) 漁船設備成本
  '1656', // Info: (20241007 - Julian) 電腦通訊設備成本
  '1661', // Info: (20241007 - Julian) 試驗設備成本
  '1666', // Info: (20241007 - Julian) 污染防治設備成本
  '1671', // Info: (20241007 - Julian) 運輸設備成本
  '1676', // Info: (20241007 - Julian) 船舶設備成本
  '1681', // Info: (20241007 - Julian) 碼頭設備成本
  '1686', // Info: (20241007 - Julian) 飛航設備成本
  '1691', // Info: (20241007 - Julian) 辦公設備成本
  '1696', // Info: (20241007 - Julian) 營業器具成本（觀光飯店業適用）
  '1701', // Info: (20241007 - Julian) 機具設備成本
  '1706', // Info: (20241007 - Julian) 遊樂設備成本
  '1711', // Info: (20241007 - Julian) 景觀園藝成本
  '1716', // Info: (20241007 - Julian) 租賃資產成本
  '1721', // Info: (20241007 - Julian) 出租資產－機器設備成本
  '1726', // Info: (20241007 - Julian) 出租資產－其他成本
  '1731', // Info: (20241007 - Julian) 租賃改良成本
  '1736', // Info: (20241007 - Julian) 其他設備成本
  '1740', // Info: (20241007 - Julian) 未完工程及待驗設備
  '1746', // Info: (20241007 - Julian) 生產性植物成本
  '1751', // Info: (20241007 - Julian) 礦產資源成本
  '17AA', // Info: (20241007 - Julian) 使用權資產－土地成本
  '17BA', // Info: (20241007 - Julian) 使用權資產－土地改良物成本
  '17CA', // Info: (20241007 - Julian) 使用權資產－房屋及建築成本
  '17DA', // Info: (20241007 - Julian) 使用權資產－機器設備成本
  '17EA', // Info: (20241007 - Julian) 使用權資產－運輸設備成本
  '17FA', // Info: (20241007 - Julian) 使用權資產－辦公設備成本
  '17GA', // Info: (20241007 - Julian) 使用權資產－其他資產成本
  '1761', // Info: (20241007 - Julian) 投資性不動產－土地
  '1765', // Info: (20241007 - Julian) 投資性不動產－建築物
  '1771', // Info: (20241007 - Julian) 投資性不動產－租賃權益
  '1776', // Info: (20241007 - Julian) 投資性不動產－使用權資產
  '1773', // Info: (20241007 - Julian) 建造中之投資性不動產
  '1782', // Info: (20241007 - Julian) 商標權
  '1786', // Info: (20241007 - Julian) 專利權
  '1792', // Info: (20241007 - Julian) 特許權
  '1796', // Info: (20241007 - Julian) 著作權
  '1802', // Info: (20241007 - Julian) 電腦軟體
  '1805', // Info: (20241007 - Julian) 商譽
  '1812', // Info: (20241007 - Julian) 專門技術
  '1822', // Info: (20241007 - Julian) 其他無形資產
  '1826', // Info: (20241007 - Julian) 發展中之無形資產
  '1831', // Info: (20241007 - Julian) 消耗性生物資產－非流動
  '1835', // Info: (20241007 - Julian) 生產性生物資產－非流動
  '1906', // Info: (20241007 - Julian) 有形探勘及評估資產成本
  '1911', // Info: (20241007 - Julian) 無形探勘及評估資產成本
];

export const AccountCodesOfAPandAR = [
  '1141', // Info: (20241007 - Julian) 合約資產－流動
  '1151', // Info: (20241007 - Julian) 應收票據
  '1152', // Info: (20241007 - Julian) 其他應收票據
  '1161', // Info: (20241007 - Julian) 應收票據－關係人
  '1162', // Info: (20241007 - Julian) 其他應收票據－關係人
  '1172', // Info: (20241007 - Julian) 應收帳款
  '1173', // Info: (20241007 - Julian) 應收分期帳款
  '1175', // Info: (20241007 - Julian) 應收租賃款
  '1181', // Info: (20241007 - Julian) 應收帳款－關係人
  '1182', // Info: (20241007 - Julian) 應收分期帳款－關係人
  '1184', // Info: (20241007 - Julian) 應收租賃款－關係人
  '1190', // Info: (20241007 - Julian) 應收建造合約款
  '1195', // Info: (20241007 - Julian) 應收建造合約款－關係人
  '119A', // Info: (20241007 - Julian) 應收營業租賃款
  '119C', // Info: (20241007 - Julian) 應收融資租賃款
  '119F', // Info: (20241007 - Julian) 應收營業租賃款—關係人
  '119H', // Info: (20241007 - Julian) 應收融資租賃款—關係人
  '1201', // Info: (20241007 - Julian) 應收退稅款
  '1202', // Info: (20241007 - Julian) 未收代收款（海陸運輸業適用）
  '1203', // Info: (20241007 - Julian) 應收工程保留款
  '1204', // Info: (20241007 - Julian) 應收歸墊款
  '1205', // Info: (20241007 - Julian) 應收收益
  '1206', // Info: (20241007 - Julian) 其他應收款－其他
  '1211', // Info: (20241007 - Julian) 應收收益－關係人
  '1212', // Info: (20241007 - Julian) 其他應收款－關係人－其他
  '1221', // Info: (20241007 - Julian) 應收所得稅退稅款
  '1222', // Info: (20241007 - Julian) 預付所得稅
  '1325', // Info: (20241007 - Julian) 預付土地款
  '1412', // Info: (20241007 - Julian) 預付租金
  '1414', // Info: (20241007 - Julian) 預付保險費
  '1419', // Info: (20241007 - Julian) 其他預付費用
  '1421', // Info: (20241007 - Julian) 預付貨款
  '1422', // Info: (20241007 - Julian) 預付投資款
  '1429', // Info: (20241007 - Julian) 其他預付款
  '1471', // Info: (20241007 - Julian) 暫付款
  '1472', // Info: (20241007 - Julian) 代付款
  '1475', // Info: (20241007 - Julian) 代理店往來（海陸運輸業適用）
  '1478', // Info: (20241007 - Julian) 工程存出保證金
  '1561', // Info: (20241007 - Julian) 合約資產－非流動
  '1915', // Info: (20241007 - Julian) 預付設備款
  '1920', // Info: (20241007 - Julian) 存出保證金
  '1931', // Info: (20241007 - Julian) 長期應收票據
  '1932', // Info: (20241007 - Julian) 長期應收款
  '1933', // Info: (20241007 - Julian) 長期應收分期帳款
  '1935', // Info: (20241007 - Julian) 長期應收租賃款
  '1941', // Info: (20241007 - Julian) 長期應收票據－關係人
  '1942', // Info: (20241007 - Julian) 長期應收款－關係人
  '1943', // Info: (20241007 - Julian) 長期應收分期帳款－關係人
  '1945', // Info: (20241007 - Julian) 長期應收租賃款－關係人
  '1947', // Info: (20241007 - Julian) 催收款項－關係人
  '194B', // Info: (20241007 - Julian) 長期應收營業租賃款
  '194E', // Info: (20241007 - Julian) 長期應收融資租賃款
  '194I', // Info: (20241007 - Julian) 長期應收營業租賃款—關係人
  '194L', // Info: (20241007 - Julian) 長期應收融資租賃款—關係人
  '1985', // Info: (20241007 - Julian) 長期預付租金
  '2102', // Info: (20241007 - Julian) 銀行借款
  '2108', // Info: (20241007 - Julian) 其他短期借款
  '2131', // Info: (20241007 - Julian) 預收貨款
  '2132', // Info: (20241007 - Julian) 預收房地款
  '2133', // Info: (20241007 - Julian) 預收收入
  '2139', // Info: (20241007 - Julian) 其他合約負債
  '2151', // Info: (20241007 - Julian) 應付票據
  '2152', // Info: (20241007 - Julian) 其他應付票據
  '2161', // Info: (20241007 - Julian) 應付票據－關係人
  '2162', // Info: (20241007 - Julian) 其他應付票據－關係人
  '2171', // Info: (20241007 - Julian) 應付帳款
  '2172', // Info: (20241007 - Julian) 暫估應付帳款
  '2181', // Info: (20241007 - Julian) 應付帳款－關係人
  '2182', // Info: (20241007 - Julian) 暫估應付帳款－關係人
  '2190', // Info: (20241007 - Julian) 應付建造合約款
  '2195', // Info: (20241007 - Julian) 應付建造合約款－關係人
  '2202', // Info: (20241007 - Julian) 應付租金
  '2203', // Info: (20241007 - Julian) 應付利息
  '2204', // Info: (20241007 - Julian) 暫估應付費用
  '2209', // Info: (20241007 - Julian) 其他應付費用
  '2211', // Info: (20241007 - Julian) 應付工程保留款
  '2212', // Info: (20241007 - Julian) 應付土地房屋款
  '2213', // Info: (20241007 - Julian) 應付設備款
  '2215', // Info: (20241007 - Julian) 應付營業稅
  '2219', // Info: (20241007 - Julian) 其他應付款－其他
  '2220', // Info: (20241007 - Julian) 其他應付款項－關係人
  '2281', // Info: (20241007 - Julian) 租賃負債－非關係人
  '2282', // Info: (20241007 - Julian) 租賃負債－關係人
  '2313', // Info: (20241007 - Julian) 遞延收入
  '2315', // Info: (20241007 - Julian) 其他預收款
  '2322', // Info: (20241007 - Julian) 一年或一營業週期內到期長期借款
  '2323', // Info: (20241007 - Julian) 一年或一營業週期內到期長期應付票據及款項－非關係人
  '2324', // Info: (20241007 - Julian) 一年或一營業週期內到期長期應付票據及款項－關係人
  '2330', // Info: (20241007 - Julian) 暫收款
  '2335', // Info: (20241007 - Julian) 代收款
  '2350', // Info: (20241007 - Julian) 代理店往來（海陸運輸業適用）
  '2355', // Info: (20241007 - Julian) 應付租賃款－流動
  '2365', // Info: (20241007 - Julian) 退款負債－流動
  '2370', // Info: (20241007 - Julian) 財務保證負債－流動
  '2399', // Info: (20241007 - Julian) 其他流動負債－其他
  '2527', // Info: (20241007 - Julian) 合約負債－非流動
  '2541', // Info: (20241007 - Julian) 銀行長期借款
  '2542', // Info: (20241007 - Julian) 其他長期借款
  '2543', // Info: (20241007 - Julian) 分期償付之借款
  '2581', // Info: (20241007 - Julian) 租賃負債－非關係人
  '2582', // Info: (20241007 - Julian) 租賃負債－關係人
  '2611', // Info: (20241007 - Julian) 長期應付票據
  '2612', // Info: (20241007 - Julian) 長期應付款
  '2613', // Info: (20241007 - Julian) 應付租賃款－非流動
  '2614', // Info: (20241007 - Julian) 長期應付租金
  '2621', // Info: (20241007 - Julian) 長期應付票據－關係人
  '2622', // Info: (20241007 - Julian) 長期應付款－關係人
  '2623', // Info: (20241007 - Julian) 長期應付租賃負債－關係人
  '2624', // Info: (20241007 - Julian) 長期應付租金－關係人
  '2630', // Info: (20241007 - Julian) 長期遞延收入
  '2645', // Info: (20241007 - Julian) 存入保證金
  '2675', // Info: (20241007 - Julian) 退款負債－非流動
  '2680', // Info: (20241007 - Julian) 財務保證負債－非流動
];
