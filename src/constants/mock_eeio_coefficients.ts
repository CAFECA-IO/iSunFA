export const MOCK_EEIO_COEFFICIENTS = [
  {
    id: "mock-eeio-1",
    name: "資訊與通訊服務",
    description:
      "適用於市內電話、網路月租費、手機通訊費等支出 (Spend-based EEIO)",
    unit: "TWD",
    emissionFactor: "0.00045", // Info: (20260522 - Tzuhan) 假設：每花 1 塊台幣產生 0.00045 kg CO2e
    source: "Internal_Proxy_Estimation_Based_On_Spend",
    category: "EEIO_PROXY",
    versionYear: "2024_MOCK_EEIO",
    isVerified: true,
  },
  {
    id: "mock-eeio-2",
    name: "住宿與餐飲服務",
    description: "適用於員工出差住宿、差旅餐飲等支出 (Spend-based EEIO)",
    unit: "TWD",
    emissionFactor: "0.00062",
    source: "Internal_Proxy_Estimation_Based_On_Spend",
    category: "EEIO_PROXY",
    versionYear: "2024_MOCK_EEIO",
    isVerified: true,
  },
  {
    id: "mock-eeio-3",
    name: "不動產與設備租賃",
    description: "適用於辦公室租金、設備租金等支出 (Spend-based EEIO)",
    unit: "TWD",
    emissionFactor: "0.00021",
    source: "Internal_Proxy_Estimation_Based_On_Spend",
    category: "EEIO_PROXY",
    versionYear: "2024_MOCK_EEIO",
    isVerified: true,
  },
  {
    id: "mock-eeio-4",
    name: "專業與各項服務",
    description:
      "適用於法律顧問費、會計師簽證費、軟體訂閱費等支出 (Spend-based EEIO)",
    unit: "TWD",
    emissionFactor: "0.00015",
    source: "Internal_Proxy_Estimation_Based_On_Spend",
    category: "EEIO_PROXY",
    versionYear: "2024_MOCK_EEIO",
    isVerified: true,
  },
];
