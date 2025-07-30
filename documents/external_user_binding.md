# iSunFA 外部系統整合登入與財報查詢說明文件
iSunFA 支援透過 Email、Google 進行登入，同時提供外部系統整合機制，讓第三方服務可將使用者 ID 直接與 iSunFA 用戶關聯，實現登入後綁定及財務報表嵌入式查詢功能。

## 登入整合說明
外部系統可透過下列方式導向使用者至 iSunFA 登入頁：
```typescript
REDIRECT https://isunfa.com/users/login?external=<external>&uid=<uid>
```
| 參數名稱       | 說明                          |
| ---------- | --------------------------- |
| `external` | 外部系統名稱（如：`fundswap.com.tw`）       |
| `uid`      | 外部系統中對應的用戶識別碼（如：`12345678`） |

## 登入行為
- 若用戶為首次登入，iSunFA 將自動建立帳號並綁定 external 與 uid。
- 若用戶已登入過，系統會辨識綁定關係並導回登入後頁面。

## 查詢外部用戶財報 API
登入完成後，可使用以下 API 查詢該用戶對應的公開財務報表清單。
```typescript
GET https://isunfa.com/api/v2/external/:external/uid/:uid
// EX: https://isunfa.com/api/v2/external/fundswap.com.tw/uid/12345678
```

### 回傳格式
```json
[
  {
    "name": "2024 Q1 財務報表",
    "balance": "https://isunfa.com/embed/view/10002751?report_type=balance",
    "cashFlow": "https://isunfa.com/embed/view/10002750?report_type=cash-flow",
    "comprehensiveIncome": "https://isunfa.com/embed/view/10002749?report_type=comprehensive-income"
  }
]
```
| 欄位                    | 說明        |
| --------------------- | --------- |
| `name`                | 帳本名稱      |
| `balance`             | 資產負債表嵌入網址 |
| `cashFlow`            | 現金流量表嵌入網址 |
| `comprehensiveIncome` | 綜合損益表嵌入網址 |

### 嵌入報表建議
```html
<iframe
  src="https://isunfa.com/embed/view/10002751?report_type=balance"
  width="100%"
  height="600"
  frameborder="0">
</iframe>
```

## 聯絡我們
如需合作或技術整合協助，請聯繫 iSunFA 技術支援團隊
contact@isunfa.com

> 讓財報嵌入更簡單，讓數據公開更透明  
> iSunFA - 為信任打造的智慧會計雲平台
