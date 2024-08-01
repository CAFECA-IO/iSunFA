\*## API code API code example : `A011001 `

The initial letter 'A' indicates that the API is located in a folder whose name begins with 'A'.
Following this, the first two digits '01' specify the API's position in a sequence of folders,
suggesting that it is the first folder starting with 'A'. The third digit '1' denotes the API's
position within a subsequence of folders inside the initial folder starting with 'A', indicating it
is in the first subfolder. Lastly, the final three digits '001' represent the API's sequence number
within the subfolder, meaning it is the first API listed there.

# API list

### BaseUrl: `/api/v1`

### 除 [A010001](#getAuditReports), [C070001](#getChallenge), [S030001](#signIn), [S040001](#signUp), [S050001](#signOut), [S060001](#getSession) API不驗證登入, 其餘API皆會驗證登入

- [A010001](#getAuditReports) - `GET /audit_report` -
  [iSunFA-Landing-page-Animation10](https://www.figma.com/file/4PS1QfFhlwIrJ5WwyDcWws/iSunFA-Landing-page?type=design&node-id=497%3A34413&mode=design&t=EuAwNRnYY71DBubL-1)
  [不需驗證登入]
- [A020001](#getAllAccounts) - `GET /company/:companyId/account` - `ISFMK00040`, `ISFMK00031`
- [A020002](#getAccountsById) - `GET /company/:companyId/account/:accountId`
- [A020003](#createNewSubAccountingAccount) - `POST /company/:companyId/account` - `ISFMK00040左邊`
- [A020004](#updateOwnAccountInfoById) - `PUT /company/:companyId/account/:accountId` -
  `ISFMK00031下面`
- [A021005](#deleteOwnAccountById) - `DELETE /company/:companyId/account/:accountId` -
  `ISFMK00040左邊`
- ~[A030006](#getPublicAccounts) - `GET /account_public` - `ISFMK00031`~
- [A040001](#createAsset) - `POST /company/:companyId/asset` - `ISFMK00052`
- [A040002](#listAsset) - `GET /company/:companyId/asset` - `ISFMK00052`
- [A041001](#getAsset) - `GET /company/:companyId/asset/:assetId` - `ISFMK00052`
- [A041002](#updateAsset) - `PUT /company/:companyId/asset/:assetId` - `ISFMK00052`
- [A050001](#askAiStatus) - `GET /company/:companyId/ask_ai/:resultId/status?aiApi=` - `ISFMK00052`
- [A050002](#askAiResult) - `GET /company/:companyId/ask_ai/:resultId?aiApi=` - `ISFMK00052`
- [A060001](#listAdmin) - `GET /company/:companyId/admin` - `ISFMK00005`
- [A060002](#getAdminById) - `GET /company/:companyId/admin/:adminId` - `ISFMK00005`, ``ISFMK00063`
- [A060003](#updateAdminById) - `PUT /company/:companyId/admin/:adminId` - `ISFMK00063`
- [A060004](#deleteAdminById) - `DELETE /company/:companyId/admin/:adminId` - `ISFMK00063`
- [A060005](#transferOwner) - `PUT /company/:companyId/transfer_owner` - `ISFMK0069`
- [C010001](#listClient) - `GET /company/:companyId/client` - `ISFMK00032`
- [C010002](#createClient) - `POST /company/:companyId/client` - `ISFMK00032`
- [C011001](#getClientById) - `GET /company/:companyId/client/:clientId` - `ISFMK00032`
- [C011002](#updateClientById) - `PUT /company/:companyId/client/:clientId` - `ISFMK00032`
- [C011003](#deleteClientById) - `DELETE /company/:companyId/client/:clientId` - `ISFMK00032`
- [C020001](#getCertificate) - `GET /company/:companyId/certificate/:clientId`
- [C030001](#listContract) - `GET /company/:companyId/contract` - `ISFMK00003`
- [C030002](#createAContract) - `POST /company/:companyId/contract` - `ISFMK00011`
- [C031001](#getAContract) - `GET /company/:companyId/contract/:contractId`-`ISFMK0008`
- [C031002](#updateAContract) - `PUT /company/:companyId/contract/:contractId` - `ISFMK00011`
- [C040001](#listcompanies) - `GET /company` - `ISFMK00004`
- [C040002](#createcompany) - `POST /company` - `ISFMK00004`
- [C041001](#getcompanybyid) - `GET /company/:companyId` - `ISFMK00069`
- [C041002](#updatecompany) - `PUT /company/:companyId` - `ISFMK00069`
- [C041003](#deletecompany) - `DELETE /company/:companyId` - `ISFMK00069`
- [C042001](#selectCompany) - `PUT /company/:companyId/select` - `ISFMK00004`
- [C042002](#updateCompanyImage) - `PUT /company/:companyId/image` - `ISFMK00062` 可能與`ISFMK00061`
  共用
- ~[C050001](#listcard) - `GET /company/:companyId/card` - `ISFMK00036`~
- ~[C050002](#createcard) - `POST /company/:companyId/card` - `ISFMK00036`, `ISFMK00053`~
- ~[C050003](#getCardById) - `GET /company/:companyId/card/:cardId` - `ISFMK00036`~
- ~[C060001](#deleteCardById) - `DELETE /company/:companyId/card/:cardId` - `ISFMK00036`~
- [C070001](#getChallenge) - `GET /challenge` - `ISFMK00001` [不需驗證登入]
- [D010001](#getAllDepartments) - `GET /company/:companyId/department` - `ISFMK00041`
- [E010001](#getAllEmployees) - `GET /company/:companyId/employee` - `ISFMK00041`
- [E010002](#createAnEmployee) - `POST /company/:companyId/employee` - `ISFMK00041`
- [E011001](#getAnEmployee) - `GET /company/:companyId/employee/:employeeId` -
  `ISFMK00041, ISFMK00064`
- [E011002](#deleteAnEmployee) - `DELETE /company/:companyId/employee/:employeeId` -
  `ISFMK00041, ISFMK00064`
- [E011003](#updateAnEmployee) - `PUT /company/:companyId/employee/:employeeId` - `ISFMK00064`

- [I010001](#createInvoice) - `POST /company/:companyId/invoice` - `ISFMK00034`
- [I011001](#getAnInvoice) - `GET /company/:companyId/invoice/:invoiceId` -
  `這支沒用到 備用(ISFMK00050)`
- [I011002](#updateAnInvoice) - `PUT /company/:companyId/invoice/:invoiceId`
- [I011003](#getAnInvoiceImage) - `GET /company/:companyId/invoice/:invoiceId/image` -
  `ISFMK00015, ISFMK00024`

- [I020001](#getIncomeExpenseTrendChart) - `GET /company/:companyId/income_expense_trend` -
  `ISFMK00006 右上角`
- [I030001](#createInvitation) - `POST /company/:companyId/invitation` - `ISFMK00005`

- ~[J010001](#uploadJournalDocumentImage) - `POST /company/:companyId/journals/document/upload` -
  `ISFMK00015` `ISFMK00035`~
- ~[J010002](#getjournalProcessingStatus) -
  `GET /company/:companyId/journals/document/status/:resultId` - `ISFMK00015` `ISFMK00035`~
- [J010001](#listJournal) - `GET /company/:companyId/journal` - `ISFMK00038`
- ~[J010002](#createAJournal) - `POST /company/:companyId/journal` - `ISFMK00050右邊`~
- [J011001](#getProcessedJournalData) - `GET /company/:companyId/journal/:journalId` - `ISFMK00015`
  `ISFMK00024`
- [J011002](#deleteAJournalById) - `DELETE /company/:companyId/journal/:journalId` - `ISFMK00025`

- ~[J020001](#createIncomeExpenseJournal) - `POST /company/:companyId/journals/` - `ISFMK00015`
  `ISFMK00035`~
- [K011001](#authorityKYC) - `POST /company/:companyId/kyc/authority`
- [K012001](#entityKYC) - `POST /company/:companyId/kyc/entity`
- ~[L010001](#listAllLineItems) - `GET /company/:companyId/line_items`~
- ~[L011001](#getlineitemsbylineitemid) - `GET /company/:companyId/line_items/:lineItemId`~

- [L020001](#getLaborCostChart) - `GET /company/:companyId/labor_cost_chart` - `ISFMK00006 左中`

- [O011001](#createOCRAnalyzingProcess) - `POST /company/:companyId/ocr`
- ~[O011002](#getOCRResult) - `GET /company/:companyId/ocr/:resultId`~
- [O011003](#getUnprocessedOCR) - `GET /company/:companyId/ocr`
- [0011004](#deleteOCRbyResultId) - `DELETE /company/:companyId/ocr/:resultId`
- [P020001](#listProject) - `GET /company/:companyId/project` - `ISFMK00017`
- [P020002](#createNewProject) - `POST /company/:companyId/project`
- [P021001](#getAProject) - `GET /company/:companyId/project/:projectId` - `ISFMK00033, ISFMK00006`
- [P021002](#updateAProject) - `PUT /company/:companyId/project/:projectId` - `ISFMK00061`
- [P021003](#deleteAProject) - `DELETE /company/:companyId/project/:projectId`
- ~[P022001](#getProjectContracts) -
  `GET /company/:companyId/project/:projectId/contracts`-`ISFMK00048`~
- ~[P023001](#getProjectVouchers) -
  `GET /company/:companyId/project/:projectId/vouchers`-`ISFMK00038, ISFMK00018`~
- [P024001](#getMilestone) - `GET /company/:companyId/project/:projectId/milestone` - `ISFMK00033`
- [P024002](#updateMilestone) - `PUT /company/:companyId/project/:projectId/milestone` -
  `ISFMK00033`, `ISFMK00061`
- [P025001](#getProgress) - `GET /company/:companyId/project/:projectId/progress` - `ISFMK00033`
- [P026001](#getSale) - `GET /company/:companyId/project/:projectId/sale` - `ISFMK00033`
- [P027001](#getvalue) - `GET /company/:companyId/project/:projectId/value` - `ISFMK00033`
- [P028001](#getWorkRate) - `GET /company/:companyId/project/:projectId/work_rate` - `ISFMK00033`
- ~[P030001](#getPeriodProfitTrend) - `GET /company/:companyId/profit_trend` - `ISFMK00006 左下角`~
- [P040001](#getProfitComparison) - `GET /company/:companyId/profit_comparison` -
  `ISFMK00006 右下角`
- [P050001](#getProjectProgress) - `GET /company/:companyId/project_progress` - `ISFMK00006 右上角`
- ~[P060001](#getPeriodProfitValue) - `GET /company/:companyId/profit_value` - `ISFMK00006 左上角`~
- [P070001](#getProfitInsight) - `GET /company/:companyId/profit_insight` - `ISFMK00006 左上角橘框`
- [P080001](#updateProjectImage) - `PUT /company/:companycId/project/:projectId/image` -
  `ISFMK00061`
- [R010001](#createFinancialReport) - `POST /company/:companyId/report_financial`
- [R010002](#getFinancialReportById) - `GET /company/:companyId/report_financial`
- [R011002](#getFinancialReportById) - `GET /company/:companyId/report_financial/:reportId`

- [R020001](#getAnalysisReport) - `GET /company/:companyId/report_analysis` - `ISFMK00037 `
- (待實作)[R020002](#createAnalysisReportJson) - `POST /company/:companyId/report_analysis`
- (待實作)[R021001](#getAnalysisReportJsonStatus) -
  `GET /company/:companyId/report_analysis/:reportId/status`
- (待實作)[R021002](#getAnalysisReportJsonResult) -
  `GET /company/:companyId/report_analysis/:reportId`

- [R040001](#listRoles) - `GET /company/:companyId/role` - `ISFMK00031`, `ISFMK00040`
- [R040002](#createRole) - `POST /company/:companyId/role` - `ISFMK00040`
- [R041001](#getRoleById) - `GET /company/:companyId/role/:roleId` - `ISFMK00031`, `ISFMK00040`
- [R041002](#updateRoleById) - `PUT /company/:companyId/role/:roleId` - `ISFMK00040`
- [R041003](#deleteRoleById) - `DELETE /company/:companyId/role/:roleId` - `ISFMK00040`

- [R050001](#getReportGenerated) - `GET /company/:companyId/report_generated` - `ISFMK00066`
- [R060001](#getReportPending) - `GET /company/:companyId/report_pending` - `ISFMK00066`

- [R070001](#getReportById) - `GET /company/:companyId/report/:reportId` - `ISFMK00022`

- [S010001](#listSubscription) - `GET /company/:companyId/subscription` - `ISFMK00036`
- [S010002](#createSubscription) - `POST /company/:companyId/subscription` - `ISFMK00053 `
- [S011001](#updateSubscriptionById) - `PUT /company/:companyId/subscription/:subscriptionId` -
  `ISFMK00036`
- [S011002](#deleteSubscriptionById) - `DELETE /company/:companyId/subscription/:subscriptionId` -
  `ISFMK00036`
- [S012001](#getSubscriptionReceiptById) -
  `GET /company/:companyId/subscription/:subscriptionId/receipt` - `ISFMK00020`

- [S020001](#getAllSalaryRecords) - `GET /company/:companyId/salary` - `ISFMK00067`
- [S020002](#createSalaryRecords) - `POST /company/:companyId/salary` - `ISFMK00067`
- [S020003](#updateSalaryRecords) - `PUT /company/:companyId/salary` - `ISFMK00067`
- [S020004](#getASalaryRecord) - `GET /company/:companyId/salary/:salaryId` -
  `ISFMK00039, ISFMK00023`
- [S020005](#updateASalaryRecord) - `PUT /company/:companyId/salary/:salaryId` -
  `ISFMK00039, ISFMK00023`
- [S021001](#createASalaryVoucher) - `POST /company/:companyId/salary/voucher` - `ISFMK00075右邊`
- [S022001](#getAllSalaryVoucherFolders) - `GET /company/:companyId/salary/folder` - `ISFMK00078`
- [S022002](#getASalaryVoucherFolder) - `GET /company/:companyId/salary/folder/:folderId` -
  `ISFMK00076`
- [S022003](#updateASalaryVoucherFolder) - `PUT /company/:companyId/salary/folder/:folderId` -
  `ISFMK00076`

- ~[S020001](#getEmployeesNamesByDepartments) - `GET /company/:companyId/salary` - `ISFMK00023 `~
- ~[S021001](#createAnSalaryBookkeeping) - `POST /company/:companyId/salary/:employeeId` -
  `ISFMK00023 `~
- [S030001](#signIn) - `POST /sign-in` - `ISFMK00001 ` [不需驗證登入]
- [S040001](#signUp) - `POST /sign-up` - `ISFMK00001 ` [不需驗證登入]
- [S050001](#signOut) - `POST /sign-out` [不需驗證登入]
- [S060001](#getSession) - `GET /session` - `ISFMK00001` [不需驗證登入]
- [U010001](#getAllUsers) - `GET /user`
- [U011001](#getAnUser) - `GET /user/:userId` - `ISFMK00001`, `ISFMK00062`
- [U011002](#updateAnUser) - `PUT /user/:userId` - `ISFMK00004`, `ISFMK00062`
- [U011003](#deleteAnUser) - `DELETE /user/:userId`
- [U020001](#getUnprocessJournal) - `GET /unprocess_journal`
- [U030001](#updateInvitation) - `PUT /user/:userid/invitation`
- ~[V010001](#listAllVouchers) - `GET /company/:companyId/vouchers`~
- [V010001](#createAVoucher) - `POST /company/:companyId/voucher` - `ISFMK00050`
- [V011001](#getVoucherById) - `GET /company/:companyId/voucher/:voucherId` - `ISFMK00050右邊`
- [V011002](#updateAVoucherById) - `PUT /company/:companyId/voucher/:voucherId` - `ISFMK00050右邊`
- [V012001](#vouchergetpreviewcreatingprocessstatebyresultid) -
  `GET /company/:companyId/voucher/:voucherId/process_statue` - `ISFMK00034`
- ~[V013002](#vouchergetpreviewvoucherbyresultid) - `GET /company/:companyId/voucher/:voucherId` -
  `ISFMK00034`~

# Format

## BaseUrl = /api/v1

# API Example

- description: some description

## Request

### Request url

```typescript
GET / example;
```

### Parameters

| name | type | description | required | default |
| ---- | ---- | ----------- | -------- | ------- |

### Request Example

```typescript
GET / example;
```

## Response

### Response Parameters

| name    | type    | description                  |
| ------- | ------- | ---------------------------- |
| powerby | string  | ISunFa api 1.0.0             |
| success | boolean | true or false                |
| code    | string  | response code                |
| message | string  | description of response data |
| payload | string  | response data                |

### Response Example

- 成功的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": true,
  "code": "00000000",
  "message": "example",
  "payload": "example"
}
```

- 失敗的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": false,
  "code": "09000000",
  "message": "fail request",
  "payload": null
}
```

# listAllLineItems

- Description: List all Line Items

## Request

### Request url

```
GET /company/:companyId/line_items
```

### Query

| name  | type   | description                                     | require | default |
| ----- | ------ | ----------------------------------------------- | ------- | ------- |
| page  | number | which page of line items you want to get        | false   | 1       |
| limit | number | how many line items you want to get in one page | false   | 10      |

### Request Example

```
GET /company/1/line_items?page=1&limit=10
```

## Response

### Response Parameters

| name    | type          | description                                                              |
| ------- | ------------- | ------------------------------------------------------------------------ |
| powerby | string        | ISunFa api 1.0.0                                                         |
| success | boolean       | true \| false                                                            |
| code    | string        | response code                                                            |
| message | string        | description of response data                                             |
| payload | ILineItem\[\] | Line items of voucher, each line item represent each line in irl voucher |

ILineItem

| name          | type                | description                                       |
| ------------- | ------------------- | ------------------------------------------------- |
| lineItemIndex | string (yyyy-mm-dd) | index of lineItem                                 |
| account       | string              | account (會計科目) that this lineItem will impact |
| description   | string              | description of lineItem                           |
| debit         | boolean             | - true: is Debit<br>- false: is Credit            |
| amount        | number              | amounts of money a line item has                  |

### Response Example

- 成功的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": true,
  "code": "200",
  "message": "List of line items return successfully",
  "payload": [
    {
      "lineItemIndex": "1229001001",
      "account": "銀行存款",
      "description": "港幣120000 * 3.916",
      "debit": true,
      "amount": 469920
    },
    {
      "lineItemIndex": "1229001002",
      "account": "營業收入",
      "description": "港幣120000 * 3.916",
      "debit": false,
      "amount": 469920
    }
  ]
}
```

- 失敗的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": false,
  "code": "400",
  "message": "Reason why request has failed"
}
```

# getLineItemsByLineItemId

- Description: Get line item by providing `[lineItemId]`

## Request

### Request url

```
GET /company/:companyId/line_items/:lineItemId
```

### Parameters

| name       | type   | description     | require | default   |
| ---------- | ------ | --------------- | ------- | --------- |
| lineItemId | string | id of line item | true    | undefined |

### Request Example

```
GET /company/1/line_items/1229001001
```

## Response

### Response Parameters

| name    | type      | description                                                             |
| ------- | --------- | ----------------------------------------------------------------------- |
| powerby | string    | ISunFa api 1.0.0                                                        |
| success | boolean   | true \| false                                                           |
| code    | string    | response code                                                           |
| message | string    | description of response data                                            |
| payload | ILineItem | Line item of voucher, each line item represent each line in irl voucher |
|         |           |                                                                         |

ILineItem

| name          | type                | description                                       |
| ------------- | ------------------- | ------------------------------------------------- |
| lineItemIndex | string (yyyy-mm-dd) | index of lineItem                                 |
| account       | string              | account (會計科目) that this lineItem will impact |
| description   | string              | description of lineItem                           |
| debit         | boolean             | - true: is Debit<br>- false: is Credit            |
| amount        | number              | amounts of money a line item has                  |

### Response Example

- 成功的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": true,
  "code": "200",
  "message": "List of line items return successfully",
  "payload": {
    "lineItemIndex": "1229001001",
    "account": "銀行存款",
    "description": "港幣120000 * 3.916",
    "debit": true,
    "amount": 469920
  }
}
```

- 失敗的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": false,
  "code": "400",
  "message": "Reason why request has failed"
}
```

# listClient

- description: list all clients

## Request

### Request url

```typescript
GET /company/:companyId/client
```

### Parameters

| name     | type    | description     | required | default |
| -------- | ------- | --------------- | -------- | ------- |
| favorite | boolean | favorite client | false    | false   |

### Request Example

```typescript
GET /company/1/client?favorite=false
```

## Response

### Response Parameters

| name    | type     | description                  |
| ------- | -------- | ---------------------------- |
| powerby | string   | ISunFa api 1.0.0             |
| success | boolean  | true or false                |
| code    | string   | response code                |
| message | string   | description of response data |
| payload | client[] | response data                |

#### client

| name      | type    | description                                   |
| --------- | ------- | --------------------------------------------- |
| id        | string  | client's id                                   |
| companyId | string  | id of the company associated with this client |
| name      | string  | client's name                                 |
| taxId     | string  | client's tax id                               |
| favorite  | boolean | favorite client                               |
| createdAt | number  | create time                                   |
| updatedAt | number  | update time                                   |

### Response Example

- 成功的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": true,
  "code": "200",
  "message": "list all client ",
  "payload": [
    {
      "id": "1",
      "name": "cafeca",
      "taxId": "1234",
      "favorite": false,
      "createdAt": 1630000000,
      "updatedAt": 1630000000
    },
    {
      "id": "2",
      "name": "isunfa",
      "taxId": "3333",
      "favorite": false,
      "createdAt": 1630000000,
      "updatedAt": 1630000000
    }
  ]
}
```

- 失敗的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": false,
  "code": "500",
  "message": "internal server error",
  "payload": null
}
```

# getClientById

- description: get client by code

## Request

### Request url

```typescript
GET /company/:companyId/client/:id
```

### Request Example

```typescript
GET / company / 1 / client / 1;
```

## Response

### Response Parameters

| name    | type    | description                  |
| ------- | ------- | ---------------------------- |
| powerby | string  | ISunFa api 1.0.0             |
| success | boolean | true or false                |
| code    | string  | response code                |
| message | string  | description of response data |
| payload | client  | response data                |

#### client

| name      | type    | description                                   |
| --------- | ------- | --------------------------------------------- |
| id        | string  | client's id                                   |
| companyId | string  | id of the company associated with this client |
| name      | string  | client's name                                 |
| taxId     | string  | client's tax id                               |
| favorite  | boolean | favorite client                               |
| createdAt | number  | create time                                   |
| updatedAt | number  | update time                                   |

### Response Example

- 成功的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": true,
  "code": "200",
  "message": "get clients by id",
  "payload": {
    "id": "1",
    "name": "cafeca",
    "taxId": "1234",
    "favorite": false,
    "createdAt": 1630000000,
    "updatedAt": 1630000000
  }
}
```

- 失敗的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": false,
  "code": "422",
  "message": "invalid input parammeter",
  "payload": null
}
```

# createClient

- description: create client

## Request

### Request url

```typescript
POST /company/:companyId/client/
```

### body

| name     | type    | description     | required | default |
| -------- | ------- | --------------- | -------- | ------- |
| name     | string  | client's name   | true     | -       |
| taxId    | string  | client's tax id | true     | -       |
| favorite | boolean | favorite client | false    | false   |

### Request Example

```typescript
POST / company / 1 / client;

const body = {
  name: 'cafeca',
  taxId: '1234',
  favorite: false,
};
```

## Response

### Response Parameters

| name    | type    | description                  |
| ------- | ------- | ---------------------------- |
| powerby | string  | ISunFa api 1.0.0             |
| success | boolean | true or false                |
| code    | string  | response code                |
| message | string  | description of response data |
| payload | client  | response data                |

#### client

| name      | type    | description                                   |
| --------- | ------- | --------------------------------------------- |
| id        | string  | client's id                                   |
| companyId | string  | id of the company associated with this client |
| name      | string  | client's name                                 |
| taxId     | string  | client's tax id                               |
| favorite  | boolean | favorite client                               |
| createdAt | number  | create time                                   |
| updatedAt | number  | update time                                   |

### Response Example

- 成功的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": true,
  "code": "200",
  "message": "create client successfully",
  "payload": {
    "id": "1",
    "name": "cafeca",
    "taxId": "1234",
    "favorite": false
  }
}
```

- 失敗的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": false,
  "code": "422",
  "message": "invalid input parameter",
  "payload": null
}
```

# updateClientById

- description: update client by id

## Request

### Request url

```typescript
PUT /company/:companyId/client/:id
```

### body

| name     | type    | description     | required | default |
| -------- | ------- | --------------- | -------- | ------- |
| name     | string  | client's name   | true     | -       |
| taxId    | string  | client's tax id | true     | -       |
| favorite | boolean | favorite client | false    | false   |

### Request Example

```typescript
PUT / company / 1 / client / 1234;

const body = {
  name: 'cafeca',
  taxId: '5678',
  favorite: false,
};
```

## Response

### Response Parameters

| name    | type    | description                  |
| ------- | ------- | ---------------------------- |
| powerby | string  | ISunFa api 1.0.0             |
| success | boolean | true or false                |
| code    | string  | response code                |
| message | string  | description of response data |
| payload | client  | response data                |

#### client

| name      | type    | description                                   |
| --------- | ------- | --------------------------------------------- |
| id        | string  | client's id                                   |
| companyId | string  | id of the company associated with this client |
| name      | string  | client's name                                 |
| taxId     | string  | client's tax id                               |
| favorite  | boolean | favorite client                               |
| createdAt | number  | create time                                   |
| updatedAt | number  | update time                                   |

### Response Example

- 成功的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": true,
  "code": "200",
  "message": "update client successfully",
  "payload": {
    "id": "1",
    "name": "cafeca",
    "taxId": "1234",
    "favorite": false,
    "createdAt": 1630000000,
    "updatedAt": 1630000000
  }
}
```

- 失敗的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": false,
  "code": "422",
  "message": "invalid input parameter",
  "payload": null
}
```

# deleteClientById

- description: delete client by id

## Request

### Request url

```typescript
DELETE /company/:companyId/client/:id
```

### Request Example

```typescript
DELETE / company / 1 / client / 2;
```

## Response

### Response Parameters

| name    | type    | description                  |
| ------- | ------- | ---------------------------- |
| powerby | string  | ISunFa api 1.0.0             |
| success | boolean | true or false                |
| code    | string  | response code                |
| message | string  | description of response data |
| payload | client  | response data                |

#### client

| name      | type    | description                                   |
| --------- | ------- | --------------------------------------------- |
| id        | string  | client's id                                   |
| companyId | string  | id of the company associated with this client |
| name      | string  | client's name                                 |
| taxId     | string  | client's tax id                               |
| favorite  | boolean | favorite client                               |
| createdAt | number  | create time                                   |
| updatedAt | number  | update time                                   |

### Response Example

- 成功的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": true,
  "code": "200",
  "message": "delete client successfully",
  "payload": {
    "id": "2",
    "name": "isunfa",
    "taxId": "3333",
    "favorite": false,
    "createdAt": 1630000000,
    "updatedAt": 1630000000
  }
}
```

- 失敗的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": false,
  "code": "422",
  "message": "invalid input parameter",
  "payload": null
}
```

# getCertificate

## Description

Retrieve an image of a specific certificate （會計憑證等).

## Request

### URL

```
GET /company/:companyId/certificate/:id
```

### Parameters

| name | type   | description                           | required |
| ---- | ------ | ------------------------------------- | -------- |
| id   | string | Unique identifier for the certificate | true     |

### Request Example

```
GET /company/1/certificate/1
```

## Response

### Headers

The response will have the Content-Type header set to an image MIME type (like `image/jpeg` or
`image/png`) to indicate that an image is being returned.

### Response Body

The body of the response will be the binary data of the image.

### Response Example

The response will be the image file itself, not a JSON object.

# listContract

- Description: Retrieve a list of contracts associated with a specific project, with pagination
  support.

## Request

### Request URL

```
GET /company/:companyId/contract
```

### Query Parameters

| name   | type   | description                                                                                                                   | required | default   |
| ------ | ------ | ----------------------------------------------------------------------------------------------------------------------------- | -------- | --------- |
| page   | number | Page number of the contract                                                                                                   | false    | 1         |
| limit  | number | Number of contracts to return per page                                                                                        | false    | 10        |
| status | string | return contracts that on certain stage<br>("designing" \| "developing" \| "betaTesting" \| "selling" \| "sold" \| "archived") | false    | undefined |
| sort   | string | if not provided or provided "desc", will be sort by descent, provide other words will be sort by absent                       | false    | desc      |

### Request Example

```
GET /company/1/contracts?page=2&limit=5&status=designing&sort=asc
```

## Response

### Response Parameters

| name    | type       | description                                                   |
| ------- | ---------- | ------------------------------------------------------------- |
| powerby | string     | Version of the API powering the request                       |
| success | boolean    | Indicates if the API call was successful                      |
| code    | string     | HTTP response code                                            |
| message | string     | Description of the response                                   |
| payload | Contract[] | Object containing the list of contracts and meta of page info |

Contract

| name              | type     | description                                                          |
| ----------------- | -------- | -------------------------------------------------------------------- |
| id                | number   | Unique identifier of the contract                                    |
| projectId         | number   | Unique identifier of the project associated with the contract        |
| projectName       | string   | Name of the associated project                                       |
| companyId         | number   | Unique identifier of the company associated with the contract        |
| companyName       | string   | Name of the associated company                                       |
| status            | string   | Status of the contract (valid \| invalid \| pending \| terminated)   |
| progress          | number   | Progress percentage of the contract 0~100                            |
| name              | string   | Name of the contract                                                 |
| signatory         | string   | Name of the signatory                                                |
| signatoryDate     | number   | Date of the signatory                                                |
| payment           | IPayment | Payment information of the contract                                  |
| hasContractDate   | boolean  | Whether the contract has a contract date                             |
| contractStartDate | number   | Start date of the contract                                           |
| contractEndDate   | number   | End date of the contract                                             |
| hasDeadlineDate   | boolean  | Whether the contract has a deadline date                             |
| deadlineDate      | number   | Deadline date of the contract                                        |
| hasWarrantyDate   | boolean  | Whether the contract has a warranty date                             |
| warrantyStartDate | number   | Start date of the warranty period                                    |
| warrantyEndDate   | number   | End date of the warranty period                                      |
| serviceType       | string   | Type of service (buyout \| usage \| subscription\| technicalSupport) |
| estimatedCost     | number   | Estimated cost of the contract                                       |
| createdAt         | number   | Date of creation of the contract                                     |
| updatedAt         | number   | Date of the last update of the contract                              |

IPayment

| name              | type    | description                                 |
| ----------------- | ------- | ------------------------------------------- |
| isRevenue         | boolean | Whether the payment is revenue              |
| price             | number  | Total price of the payment                  |
| hasTax            | boolean | Whether the payment has tax                 |
| taxPercentage     | number  | Tax percentage of the payment               |
| hasFee            | boolean | Whether the payment has fee                 |
| fee               | number  | Fee of the payment                          |
| method            | string  | Payment method                              |
| period            | string  | Payment period (atOnce \| installment)      |
| installmentPeriod | number  | Number of installments                      |
| alreadyPaid       | number  | Amount already paid                         |
| status            | string  | Payment status (pending \| paid \| overdue) |
| progress          | number  | Progress percentage of the payment          |

PageMeta

| name        | type   | description                         |
| ----------- | ------ | ----------------------------------- |
| currentPage | number | The current page number             |
| totalPages  | number | The total number of pages available |
| totalItems  | number | The total number of items available |

### Response Example

- Success Response

```json
{
  "powerby": "ISunFa API v1.0.0",
  "success": true,
  "code": "200",
  "message": "Contracts retrieved successfully",
  "payload": {
    "contracts": [
      {
        "id": 1,
        "projectId": 1,
        "projectName": "Project 1",
        "companyId": 1,
        "companyName": "Company 1",
        "status": "valid",
        "progress": 50,
        "name": "Contract 1",
        "signatory": "Signatory 1",
        "signatoryDate": 1630000000,
        "payment": {
          "isRevenue": true,
          "price": 1000000,
          "hasTax": true,
          "taxPercentage": 5,
          "hasFee": true,
          "fee": 50000,
          "method": "creditCard",
          "period": "installment",
          "installmentPeriod": 3,
          "alreadyPaid": 300000,
          "status": "paid",
          "progress": 30
        },
        "hasContractDate": true,
        "contractStartDate": 1630000000,
        "contractEndDate": 1630000000,
        "hasDeadlineDate": true,
        "deadlineDate": 1630000000,
        "hasWarrantyDate": true,
        "warrantyStartDate": 1630000000,
        "warrantyEndDate": 1630000000,
        "serviceType": "subscription",
        "estimatedCost": 785000,
        "createdAt": 1630000000,
        "updatedAt": 1630000000
      },
      // ... additional contracts
    ]
    "pageMeta": {
	  "currentPage": 2,
      "totalPages": 20,
      "totalItems": 85
    }
  },
}
```

- Failure Response

```json
{
  "powerby": "ISunFa API v1.0.0",
  "success": false,
  "code": "404",
  "message": "Project not found or you do not have permission to view the contracts"
}
```

# getAContract

## Description

Retrieve detailed information extracted from a contract document after OCR processing has completed.
This data is useful for contract creation and verification.

## Request

### Request URL

```
GET /company/:companyId/contract/:contractId
```

### Parameters

| name       | type   | description            | required |
| ---------- | ------ | ---------------------- | -------- |
| contractId | string | The id of the contract | true     |

### Request Example

```bash
GET /company/1/contract/123456
```

## Response

### Response Parameters

| name    | type     | description                                     |
| ------- | -------- | ----------------------------------------------- |
| powerby | string   | The version of the API                          |
| success | boolean  | Whether the data retrieval was successful       |
| code    | string   | The response code                               |
| message | string   | A message detailing the result of the request   |
| payload | Contract | The structured data extracted from the document |

Contract

| name              | type     | description                                                          |
| ----------------- | -------- | -------------------------------------------------------------------- |
| id                | number   | Unique identifier of the contract                                    |
| projectId         | number   | Unique identifier of the project associated with the contract        |
| projectName       | string   | Name of the associated project                                       |
| companyId         | number   | Unique identifier of the company associated with the contract        |
| companyName       | string   | Name of the associated company                                       |
| status            | string   | Status of the contract (valid \| invalid \| pending \| terminated)   |
| progress          | number   | Progress percentage of the contract 0~100                            |
| name              | string   | Name of the contract                                                 |
| signatory         | string   | Name of the signatory                                                |
| signatoryDate     | number   | Date of the signatory                                                |
| payment           | IPayment | Payment information of the contract                                  |
| hasContractDate   | boolean  | Whether the contract has a contract date                             |
| contractStartDate | number   | Start date of the contract                                           |
| contractEndDate   | number   | End date of the contract                                             |
| hasDeadlineDate   | boolean  | Whether the contract has a deadline date                             |
| deadlineDate      | number   | Deadline date of the contract                                        |
| hasWarrantyDate   | boolean  | Whether the contract has a warranty date                             |
| warrantyStartDate | number   | Start date of the warranty period                                    |
| warrantyEndDate   | number   | End date of the warranty period                                      |
| serviceType       | string   | Type of service (buyout \| usage \| subscription\| technicalSupport) |
| estimatedCost     | number   | Estimated cost of the contract                                       |
| createdAt         | number   | Date of creation of the contract                                     |
| updatedAt         | number   | Date of the last update of the contract                              |

IPayment

| name              | type    | description                                 |
| ----------------- | ------- | ------------------------------------------- |
| isRevenue         | boolean | Whether the payment is revenue              |
| price             | number  | Total price of the payment                  |
| hasTax            | boolean | Whether the payment has tax                 |
| taxPercentage     | number  | Tax percentage of the payment               |
| hasFee            | boolean | Whether the payment has fee                 |
| fee               | number  | Fee of the payment                          |
| method            | string  | Payment method                              |
| period            | string  | Payment period (atOnce \| installment)      |
| installmentPeriod | number  | Number of installments                      |
| alreadyPaid       | number  | Amount already paid                         |
| status            | string  | Payment status (pending \| paid \| overdue) |
| progress          | number  | Progress percentage of the payment          |

### Response Example

- Success Response

```json
{
  "powerby": "ISunFa API v1.0.0",
  "success": true,
  "code": "200",
  "message": "Contract data retrieved successfully.",
  "payload": {
    {
        "id": 1,
        "projectId": 1,
        "projectName": "Project 1",
        "companyId": 1,
        "companyName": "Company 1",
        "status": "valid",
        "progress": 50,
        "name": "Contract 1",
        "signatory": "Signatory 1",
        "signatoryDate": 1630000000,
        "payment": {
          "isRevenue": true,
          "price": 1000000,
          "hasTax": true,
          "taxPercentage": 5,
          "hasFee": true,
          "fee": 50000,
          "method": "creditCard",
          "period": "installment",
          "installmentPeriod": 3,
          "alreadyPaid": 300000,
          "status": "paid",
          "progress": 30
        },
        "hasContractDate": true,
        "contractStartDate": 1630000000,
        "contractEndDate": 1630000000,
        "hasDeadlineDate": true,
        "deadlineDate": 1630000000,
        "hasWarrantyDate": true,
        "warrantyStartDate": 1630000000,
        "warrantyEndDate": 1630000000,
        "serviceType": "subscription",
        "estimatedCost": 785000,
        "createdAt": 1630000000,
        "updatedAt": 1630000000
      }
  }
}
```

- Failure Response

```json
{
  "powerby": "ISunFa API v1.0.0",
  "success": false,
  "code": "404",
  "message": "Contract OCR result data not found for the provided resultId."
}
```

# createAContract

## Description

This API endpoint is for creating a new contract in the system using data that may be provided
manually or derived from an OCR-processed document.

## Request

### Request URL

```
POST /company/:companyId/contract
```

### Headers

| Name         | Type   | Description      | Required |
| ------------ | ------ | ---------------- | -------- |
| Content-Type | string | application/json | true     |

### Body

| projectId | number | Unique identifier of the project associated with the contract | | projectName
| string | Name of the associated project | | companyId | number | Unique identifier of the company
associated with the contract | | companyName | string | Name of the associated company | | status |
string | Status of the contract (valid \| invalid \| pending \| terminated) | | progress | number |
Progress percentage of the contract 0~100 | | name | string | Name of the contract | | signatory |
string | Name of the signatory | | signatoryDate | number | Date of the signatory | | payment |
IPayment | Payment information of the contract | | hasContractDate | boolean | Whether the contract
has a contract date | | contractStartDate | number | Start date of the contract | | contractEndDate
| number | End date of the contract | | hasDeadlineDate | boolean | Whether the contract has a
deadline date | | deadlineDate | number | Deadline date of the contract | | hasWarrantyDate |
boolean | Whether the contract has a warranty date | | warrantyStartDate | number | Start date of
the warranty period | | warrantyEndDate | number | End date of the warranty period | | serviceType |
string | Type of service (buyout \| usage \| subscription\| technicalSupport) | | estimatedCost |
number | Estimated cost of the contract | | createdAt | number | Date of creation of the contract |
| updatedAt | number | Date of the last update of the contract |

IPayment

| name              | type    | description                                 |
| ----------------- | ------- | ------------------------------------------- |
| isRevenue         | boolean | Whether the payment is revenue              |
| price             | number  | Total price of the payment                  |
| hasTax            | boolean | Whether the payment has tax                 |
| taxPercentage     | number  | Tax percentage of the payment               |
| hasFee            | boolean | Whether the payment has fee                 |
| fee               | number  | Fee of the payment                          |
| method            | string  | Payment method                              |
| period            | string  | Payment period (atOnce \| installment)      |
| installmentPeriod | number  | Number of installments                      |
| alreadyPaid       | number  | Amount already paid                         |
| status            | string  | Payment status (pending \| paid \| overdue) |
| progress          | number  | Progress percentage of the payment          |

### Request Example

```bash
POST /company/1/contract
```

### Body Example

```json
{
  "projectId": 1,
  "projectName": "Project 1",
  "companyId": 1,
  "companyName": "Company 1",
  "status": "valid",
  "progress": 50,
  "name": "Contract 1",
  "signatory": "Signatory 1",
  "signatoryDate": 1630000000,
  "payment": {
    "isRevenue": true,
    "price": 1000000,
    "hasTax": true,
    "taxPercentage": 5,
    "hasFee": true,
    "fee": 50000,
    "method": "creditCard",
    "period": "installment",
    "installmentPeriod": 3,
    "alreadyPaid": 300000,
    "status": "paid",
    "progress": 30
  },
  "hasContractDate": true,
  "contractStartDate": 1630000000,
  "contractEndDate": 1630000000,
  "hasDeadlineDate": true,
  "deadlineDate": 1630000000,
  "hasWarrantyDate": true,
  "warrantyStartDate": 1630000000,
  "warrantyEndDate": 1630000000,
  "serviceType": "subscription",
  "estimatedCost": 785000,
  "createdAt": 1630000000,
  "updatedAt": 1630000000
}
```

## Response

### Response Parameters

| name    | type     | description                                     |
| ------- | -------- | ----------------------------------------------- |
| powerby | string   | The version of the API                          |
| success | boolean  | Whether the data retrieval was successful       |
| code    | string   | The response code                               |
| message | string   | A message detailing the result of the request   |
| payload | Contract | The structured data extracted from the document |

Contract

| name              | type     | description                                                          |
| ----------------- | -------- | -------------------------------------------------------------------- |
| id                | number   | Unique identifier of the contract                                    |
| projectId         | number   | Unique identifier of the project associated with the contract        |
| projectName       | string   | Name of the associated project                                       |
| companyId         | number   | Unique identifier of the company associated with the contract        |
| companyName       | string   | Name of the associated company                                       |
| status            | string   | Status of the contract (valid \| invalid \| pending \| terminated)   |
| progress          | number   | Progress percentage of the contract 0~100                            |
| name              | string   | Name of the contract                                                 |
| signatory         | string   | Name of the signatory                                                |
| signatoryDate     | number   | Date of the signatory                                                |
| payment           | IPayment | Payment information of the contract                                  |
| hasContractDate   | boolean  | Whether the contract has a contract date                             |
| contractStartDate | number   | Start date of the contract                                           |
| contractEndDate   | number   | End date of the contract                                             |
| hasDeadlineDate   | boolean  | Whether the contract has a deadline date                             |
| deadlineDate      | number   | Deadline date of the contract                                        |
| hasWarrantyDate   | boolean  | Whether the contract has a warranty date                             |
| warrantyStartDate | number   | Start date of the warranty period                                    |
| warrantyEndDate   | number   | End date of the warranty period                                      |
| serviceType       | string   | Type of service (buyout \| usage \| subscription\| technicalSupport) |
| estimatedCost     | number   | Estimated cost of the contract                                       |
| createdAt         | number   | Date of creation of the contract                                     |
| updatedAt         | number   | Date of the last update of the contract                              |

IPayment

| name              | type    | description                                 |
| ----------------- | ------- | ------------------------------------------- |
| isRevenue         | boolean | Whether the payment is revenue              |
| price             | number  | Total price of the payment                  |
| hasTax            | boolean | Whether the payment has tax                 |
| taxPercentage     | number  | Tax percentage of the payment               |
| hasFee            | boolean | Whether the payment has fee                 |
| fee               | number  | Fee of the payment                          |
| method            | string  | Payment method                              |
| period            | string  | Payment period (atOnce \| installment)      |
| installmentPeriod | number  | Number of installments                      |
| alreadyPaid       | number  | Amount already paid                         |
| status            | string  | Payment status (pending \| paid \| overdue) |
| progress          | number  | Progress percentage of the payment          |

### Response Example

- Success Response

```json
{
  "powerby": "ISunFa API v1.0.0",
  "success": true,
  "code": "201",
  "message": "Contract data retrieved successfully.",
  "payload": {
    {
        "id": 1,
        "projectId": 1,
        "projectName": "Project 1",
        "companyId": 1,
        "companyName": "Company 1",
        "status": "valid",
        "progress": 50,
        "name": "Contract 1",
        "signatory": "Signatory 1",
        "signatoryDate": 1630000000,
        "payment": {
          "isRevenue": true,
          "price": 1000000,
          "hasTax": true,
          "taxPercentage": 5,
          "hasFee": true,
          "fee": 50000,
          "method": "creditCard",
          "period": "installment",
          "installmentPeriod": 3,
          "alreadyPaid": 300000,
          "status": "paid",
          "progress": 30
        },
        "hasContractDate": true,
        "contractStartDate": 1630000000,
        "contractEndDate": 1630000000,
        "hasDeadlineDate": true,
        "deadlineDate": 1630000000,
        "hasWarrantyDate": true,
        "warrantyStartDate": 1630000000,
        "warrantyEndDate": 1630000000,
        "serviceType": "subscription",
        "estimatedCost": 785000,
        "createdAt": 1630000000,
        "updatedAt": 1630000000
      }
  }
}
```

- Failure Response

```json
{
  "powerby": "ISunFa API v1.0.0",
  "success": false,
  "code": "404",
  "message": "Contract OCR result data not found for the provided resultId."
}
```

# updateAContract

## Description

Update existing contract details in the system using the unique identifier for a contract.

## Request

### Request URL

```
PUT /company/:companyId/contract/:contractId
```

### URL Parameters

| Name       | Type   | Description            | Required |
| ---------- | ------ | ---------------------- | -------- |
| contractId | string | The unique contract ID | true     |

### Headers

| Name         | Type   | Description      | Required |
| ------------ | ------ | ---------------- | -------- |
| Content-Type | string | application/json | true     |

### Body

| projectId | number | Unique identifier of the project associated with the contract | | projectName
| string | Name of the associated project | | companyId | number | Unique identifier of the company
associated with the contract | | companyName | string | Name of the associated company | | status |
string | Status of the contract (valid \| invalid \| pending \| terminated) | | progress | number |
Progress percentage of the contract 0~100 | | name | string | Name of the contract | | signatory |
string | Name of the signatory | | signatoryDate | number | Date of the signatory | | payment |
IPayment | Payment information of the contract | | hasContractDate | boolean | Whether the contract
has a contract date | | contractStartDate | number | Start date of the contract | | contractEndDate
| number | End date of the contract | | hasDeadlineDate | boolean | Whether the contract has a
deadline date | | deadlineDate | number | Deadline date of the contract | | hasWarrantyDate |
boolean | Whether the contract has a warranty date | | warrantyStartDate | number | Start date of
the warranty period | | warrantyEndDate | number | End date of the warranty period | | serviceType |
string | Type of service (buyout \| usage \| subscription\| technicalSupport) | | estimatedCost |
number | Estimated cost of the contract | | createdAt | number | Date of creation of the contract |
| updatedAt | number | Date of the last update of the contract |

IPayment

| name              | type    | description                                 |
| ----------------- | ------- | ------------------------------------------- |
| isRevenue         | boolean | Whether the payment is revenue              |
| price             | number  | Total price of the payment                  |
| hasTax            | boolean | Whether the payment has tax                 |
| taxPercentage     | number  | Tax percentage of the payment               |
| hasFee            | boolean | Whether the payment has fee                 |
| fee               | number  | Fee of the payment                          |
| method            | string  | Payment method                              |
| period            | string  | Payment period (atOnce \| installment)      |
| installmentPeriod | number  | Number of installments                      |
| alreadyPaid       | number  | Amount already paid                         |
| status            | string  | Payment status (pending \| paid \| overdue) |
| progress          | number  | Progress percentage of the payment          |

### Request Example

```bash
PUT /company/1/contract/:contractId
```

### Body Example

```json
{
  "projectId": 1,
  "projectName": "Project 1",
  "companyId": 1,
  "companyName": "Company 1",
  "status": "valid",
  "progress": 50,
  "name": "Contract 1",
  "signatory": "Signatory 1",
  "signatoryDate": 1630000000,
  "payment": {
    "isRevenue": true,
    "price": 1000000,
    "hasTax": true,
    "taxPercentage": 5,
    "hasFee": true,
    "fee": 50000,
    "method": "creditCard",
    "period": "installment",
    "installmentPeriod": 3,
    "alreadyPaid": 300000,
    "status": "paid",
    "progress": 30
  },
  "hasContractDate": true,
  "contractStartDate": 1630000000,
  "contractEndDate": 1630000000,
  "hasDeadlineDate": true,
  "deadlineDate": 1630000000,
  "hasWarrantyDate": true,
  "warrantyStartDate": 1630000000,
  "warrantyEndDate": 1630000000,
  "serviceType": "subscription",
  "estimatedCost": 785000,
  "createdAt": 1630000000,
  "updatedAt": 1630000000
}
```

## Response

### Response Parameters

| name    | type     | description                                     |
| ------- | -------- | ----------------------------------------------- |
| powerby | string   | The version of the API                          |
| success | boolean  | Whether the data retrieval was successful       |
| code    | string   | The response code                               |
| message | string   | A message detailing the result of the request   |
| payload | Contract | The structured data extracted from the document |

Contract

| name              | type     | description                                                          |
| ----------------- | -------- | -------------------------------------------------------------------- |
| id                | number   | Unique identifier of the contract                                    |
| projectId         | number   | Unique identifier of the project associated with the contract        |
| projectName       | string   | Name of the associated project                                       |
| companyId         | number   | Unique identifier of the company associated with the contract        |
| companyName       | string   | Name of the associated company                                       |
| status            | string   | Status of the contract (valid \| invalid \| pending \| terminated)   |
| progress          | number   | Progress percentage of the contract 0~100                            |
| name              | string   | Name of the contract                                                 |
| signatory         | string   | Name of the signatory                                                |
| signatoryDate     | number   | Date of the signatory                                                |
| payment           | IPayment | Payment information of the contract                                  |
| hasContractDate   | boolean  | Whether the contract has a contract date                             |
| contractStartDate | number   | Start date of the contract                                           |
| contractEndDate   | number   | End date of the contract                                             |
| hasDeadlineDate   | boolean  | Whether the contract has a deadline date                             |
| deadlineDate      | number   | Deadline date of the contract                                        |
| hasWarrantyDate   | boolean  | Whether the contract has a warranty date                             |
| warrantyStartDate | number   | Start date of the warranty period                                    |
| warrantyEndDate   | number   | End date of the warranty period                                      |
| serviceType       | string   | Type of service (buyout \| usage \| subscription\| technicalSupport) |
| estimatedCost     | number   | Estimated cost of the contract                                       |
| createdAt         | number   | Date of creation of the contract                                     |
| updatedAt         | number   | Date of the last update of the contract                              |

IPayment

| name              | type    | description                                 |
| ----------------- | ------- | ------------------------------------------- |
| isRevenue         | boolean | Whether the payment is revenue              |
| price             | number  | Total price of the payment                  |
| hasTax            | boolean | Whether the payment has tax                 |
| taxPercentage     | number  | Tax percentage of the payment               |
| hasFee            | boolean | Whether the payment has fee                 |
| fee               | number  | Fee of the payment                          |
| method            | string  | Payment method                              |
| period            | string  | Payment period (atOnce \| installment)      |
| installmentPeriod | number  | Number of installments                      |
| alreadyPaid       | number  | Amount already paid                         |
| status            | string  | Payment status (pending \| paid \| overdue) |
| progress          | number  | Progress percentage of the payment          |

### Response Example

- Success Response

```json
{
  "powerby": "ISunFa API v1.0.0",
  "success": true,
  "code": "200",
  "message": "Contract data retrieved successfully.",
  "payload": {
    {
        "id": 1,
        "projectId": 1,
        "projectName": "Project 1",
        "companyId": 1,
        "companyName": "Company 1",
        "status": "valid",
        "progress": 50,
        "name": "Contract 1",
        "signatory": "Signatory 1",
        "signatoryDate": 1630000000,
        "payment": {
          "isRevenue": true,
          "price": 1000000,
          "hasTax": true,
          "taxPercentage": 5,
          "hasFee": true,
          "fee": 50000,
          "method": "creditCard",
          "period": "installment",
          "installmentPeriod": 3,
          "alreadyPaid": 300000,
          "status": "paid",
          "progress": 30
        },
        "hasContractDate": true,
        "contractStartDate": 1630000000,
        "contractEndDate": 1630000000,
        "hasDeadlineDate": true,
        "deadlineDate": 1630000000,
        "hasWarrantyDate": true,
        "warrantyStartDate": 1630000000,
        "warrantyEndDate": 1630000000,
        "serviceType": "subscription",
        "estimatedCost": 785000,
        "createdAt": 1630000000,
        "updatedAt": 1630000000
      }
  }
}
```

- Failure Response

```json
{
  "powerby": "ISunFa API v1.0.0",
  "success": false,
  "code": "404",
  "message": "Contract OCR result data not found for the provided resultId."
}
```

# listCompanies

- description: list all companies
- request url

```typescript
GET / company;
```

### Request Example

```typescript
GET / company;
```

## Response

### Response Parameters

| name    | type      | description                  |
| ------- | --------- | ---------------------------- |
| powerby | string    | iSunFA v0.1.2+50             |
| success | boolean   | true or false                |
| code    | string    | response code                |
| message | string    | description of response data |
| payload | Company[] | response data                |

#### Company

| name      | type    | description                     |
| --------- | ------- | ------------------------------- |
| id        | number  | id of company                   |
| name      | string  | name of company                 |
| code      | string  | code of company                 |
| regional  | string  | regional of company             |
| kycStatus | boolean | kyc status of company           |
| imageId   | string  | image id of company             |
| startDate | number  | start date of the company       |
| createdAt | number  | create timestamp of the company |
| updatedAt | number  | update timestamp of the company |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": true,
  "code": "200",
  "message": "List successfully",
  "payload": [
    {
      "id": "1",
      "name": "iSunFA",
      "code": "168",
      "regional": "Taiwan",
      "kycStatus": false,
      "imageId": "123",
      "startDate": 1630000000,
      "createdAt": 1630000000,
      "updatedAt": 1630000000
    }
  ]
}
```

- 失敗的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "405",
  "message": "Method not allowed",
  "payload": {}
}
```

# getCompanyById

- description: get company by id

## Request

### Request url

```typescript
GET /company/:companyId
```

### Request Example

```typescript
GET / company / 1;
```

## Response

### Response Parameters

| name    | type                 | description                  |
| ------- | -------------------- | ---------------------------- |
| powerby | string               | iSunFA v0.1.2+50             |
| success | boolean              | true or false                |
| code    | string               | response code                |
| message | string               | description of response data |
| payload | CompanyDetail & Role | response data                |

#### CompanyDetail

| name      | type   | description                     |
| --------- | ------ | ------------------------------- |
| id        | number | id of company                   |
| name      | string | name of company                 |
| code      | string | code of company                 |
| regional  | string | regional of company             |
| startDate | number | start date of the company       |
| createAt  | number | create timestamp of the company |
| updateAt  | number | update timestamp of the company |
| ownerId   | number | owner of the company's id       |

#### Role

| name        | type     | description            |
| ----------- | -------- | ---------------------- |
| id          | string   | role's id              |
| name        | string   | role's name            |
| companyId   | string   | id of the company      |
| companyName | string   | name of the company    |
| permissions | string[] | permission of the role |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": true,
  "code": "200",
  "message": "Get successfully",
  "payload": {
    "company": {
      "id": "1",
      "name": "iSunFA",
      "code": "168",
      "regional": "Taiwan",
      "startDate": 1630000000,
      "createAt": 1630000000,
      "updateAt": 1630000000,
      "ownerId": 1
    },
    "role": {
      "id": "1",
      "name": "admin",
      "companyId": "1",
      "companyName": "iSunFA",
      "permissions": ["create", "read", "update", "delete"]
    }
  }
}
```

- 失敗的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "404",
  "message": "Resource not found",
  "payload": null
}
```

# createCompany

- description: create company

## Request

### Request url

```typescript
POST / company;
```

### Request Example

```typescript
POST / company;

const body = {
  name: 'iSunFA',
  code: '168',
  regional: 'Taiwan',
};
```

### Body

| name     | type   | description        |
| -------- | ------ | ------------------ |
| name     | string | company's name     |
| code     | string | company's code     |
| regional | string | company's regional |

## Response

### Response Parameters

| name    | type    | description                  |
| ------- | ------- | ---------------------------- |
| powerby | string  | iSunFA v0.1.2+50             |
| success | boolean | true or false                |
| code    | string  | response code                |
| message | string  | description of response data |
| payload | Company | response data                |

#### Company

| name      | type    | description                     |
| --------- | ------- | ------------------------------- |
| id        | number  | id of company                   |
| name      | string  | name of company                 |
| code      | string  | code of company                 |
| regional  | string  | regional of company             |
| kycStatus | boolean | kyc status of company           |
| imageId   | string  | image id of company             |
| startDate | number  | start date of the company       |
| createdAt | number  | create timestamp of the company |
| updatedAt | number  | update timestamp of the company |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": true,
  "code": "200",
  "message": "Create successfully",
  "payload": {
    "id": "1",
    "name": "iSunFA",
    "code": "168",
    "regional": "Taiwan",
    "kycStatus": false,
    "imageId": "123",
    "startDate": 1630000000,
    "createdAt": 1630000000,
    "updatedAt": 1630000000
  }
}
```

- 失敗的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "422",
  "message": "Invalid input parameter",
  "payload": {}
}
```

# updateCompany

- description: update company

## Request

### Request url

```typescript
PUT /company/:companyId
```

### Request Example

```typescript
PUT / company / 1;
```

### Body

| name     | type   | description        |
| -------- | ------ | ------------------ |
| name     | string | company's name     |
| code     | string | company's code     |
| regional | string | company's regional |

## Response

### Response Parameters

| name    | type    | description                  |
| ------- | ------- | ---------------------------- |
| powerby | string  | iSunFA v0.1.2+50             |
| success | boolean | true or false                |
| code    | string  | response code                |
| message | string  | description of response data |
| payload | Company | response data                |

#### Company

| name      | type    | description                     |
| --------- | ------- | ------------------------------- |
| id        | number  | id of company                   |
| name      | string  | name of company                 |
| code      | string  | code of company                 |
| regional  | string  | regional of company             |
| kycStatus | boolean | kyc status of company           |
| imageId   | string  | image id of company             |
| startDate | number  | start date of the company       |
| createdAt | number  | create timestamp of the company |
| updatedAt | number  | update timestamp of the company |

```typescript
{
  "name": "iSunFA",
  "code": "168",
  "regional": "Taiwan",
}
```

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": true,
  "code": "200",
  "message": "Update successfully",
  "payload": {
    "id": "1",
    "name": "iSunFA",
    "code": "168",
    "regional": "Taiwan",
    "kycStatus": false,
    "imageId": "123",
    "startDate": 1630000000,
    "createdAt": 1630000000,
    "updatedAt": 1630000000
  }
}
```

- 失敗的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "422",
  "message": "Invalid input parameter",
  "payload": {}
}
```

# updateCompanyImage

- description: update company image

## Request

### Request url

```typescript
PUT /company/:companyId/image
```

### Request Example

```typescript
PUT / company / 1;
```

### Body

| name     | type     | description                                                        | require | default |
| -------- | -------- | ------------------------------------------------------------------ | ------- | ------- |
| formData | FormData | Need to use `new FormData` to post images (see example down below) | true    | -       |

formData內包含

| name | type     | description       | require | default |
| ---- | -------- | ----------------- | ------- | ------- |
| file | File\[\] | An array of Image | true    | -       |

### Request Example

```ts
const formData = new FormData();
formData.append('file', [file]);

const body = formData;
```

## Response

### Response Parameters

| name    | type    | description                  |
| ------- | ------- | ---------------------------- |
| powerby | string  | iSunFA v0.1.2+50             |
| success | boolean | true or false                |
| code    | string  | response code                |
| message | string  | description of response data |
| payload | Company | response data                |

#### Company

| name      | type    | description                     |
| --------- | ------- | ------------------------------- |
| id        | number  | id of company                   |
| name      | string  | name of company                 |
| code      | string  | code of company                 |
| regional  | string  | regional of company             |
| kycStatus | boolean | kyc status of company           |
| imageId   | string  | image id of company             |
| startDate | number  | start date of the company       |
| createdAt | number  | create timestamp of the company |
| updatedAt | number  | update timestamp of the company |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": true,
  "code": "200",
  "message": "Update successfully",
  "payload": {
    "id": "1",
    "name": "iSunFA",
    "code": "168",
    "regional": "Taiwan",
    "kycStatus": false,
    "imageId": "123",
    "startDate": 1630000000,
    "createdAt": 1630000000,
    "updatedAt": 1630000000
  }
}
```

- 失敗的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "422",
  "message": "Invalid input parameter",
  "payload": {}
}
```

# deleteCompany

- description: delete company

## Request

### Request url

```typescript
DELETE /company/:companyId
```

### Request Example

```typescript
DELETE / company / 1;
```

## Response

### Response Parameters

| name    | type    | description                  |
| ------- | ------- | ---------------------------- |
| powerby | string  | iSunFA v0.1.2+50             |
| success | boolean | true or false                |
| code    | string  | response code                |
| message | string  | description of response data |
| payload | Company | response data                |

#### Company

| name      | type    | description                     |
| --------- | ------- | ------------------------------- |
| id        | number  | id of company                   |
| name      | string  | name of company                 |
| code      | string  | code of company                 |
| regional  | string  | regional of company             |
| kycStatus | boolean | kyc status of company           |
| imageId   | string  | image id of company             |
| startDate | number  | start date of the company       |
| createdAt | number  | create timestamp of the company |
| updatedAt | number  | update timestamp of the company |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": true,
  "code": "200",
  "message": "Update successfully",
  "payload": {
    "id": "1",
    "name": "iSunFA",
    "code": "168",
    "regional": "Taiwan",
    "kycStatus": false,
    "imageId": "123",
    "startDate": 1630000000,
    "createdAt": 1630000000,
    "updatedAt": 1630000000
  }
}
```

- 失敗的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "422",
  "message": "Invalid input parameter",
  "payload": {}
}
```

# listRoles

- description: list all roles

## Request

### Request url

```typescript
GET /company/:companyId/role
```

### Request Example

```typescript
GET / company / 1 / role;
```

## Response

### Response Parameters

| name    | type    | description                  |
| ------- | ------- | ---------------------------- |
| powerby | string  | iSunFA v0.1.2+50             |
| success | boolean | true or false                |
| code    | string  | response code                |
| message | string  | description of response data |
| payload | Role[]  | response data                |

#### Role

| name        | type     | description            |
| ----------- | -------- | ---------------------- |
| id          | string   | role's id              |
| name        | string   | role's name            |
| companyId   | string   | id of the company      |
| companyName | string   | name of the company    |
| permissions | string[] | permission of the role |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": true,
  "code": "200",
  "message": "List successfully",
  "payload": [
    {
      "id": "1",
      "name": "Bob",
      "companyId": "123",
      "companyName": "Baifa",
      "permissions": ["auditing_viewer", "accounting_editor", "internalControl_editor"]
    },
    {
      "id": "2",
      "name": "Alice",
      "companyId": "168",
      "companyName": "iSunFA",
      "permissions": ["read"]
    }
  ]
}
```

- 失敗的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "405",
  "message": "Method not allowed",
  "payload": {}
}
```

# getRoleById

- description: get role by id

## Request

### Request url

```typescript
GET /company/:companyId/role/:roleId
```

### Request Example

```typescript
GET / company / 1 / role / 1;
```

### Parameters

| name   | type   | description | require | default |
| ------ | ------ | ----------- | ------- | ------- |
| roleId | string | role id     | true    | -       |

## Response

### Response Parameters

| name    | type    | description                  |
| ------- | ------- | ---------------------------- |
| powerby | string  | iSunFA v0.1.2+50             |
| success | boolean | true or false                |
| code    | string  | response code                |
| message | string  | description of response data |
| payload | Role    | response data                |

#### Role

| name        | type     | description            |
| ----------- | -------- | ---------------------- |
| id          | string   | role's id              |
| name        | string   | role's name            |
| companyId   | string   | id of the company      |
| companyName | string   | name of the company    |
| permissions | string[] | permission of the role |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": true,
  "code": "200",
  "message": "Get successfully",
  "payload": [
    {
      "id": "1",
      "name": "Bob",
      "companyId": "1",
      "companyName": "mermer",
      "permissions": ["auditing_viewer", "accounting_editor", "internalControl_editor"]
    }
  ]
}
```

- 失敗的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "422",
  "message": "Invalid input parameter",
  "payload": {}
}
```

# createRole

- description: create role

## Request

### Request url

```typescript
POST /company/:companyId/role
```

### Request Example

```typescript
POST / company / 1 / role;

const body = {
  name: 'Bobie',
};
```

### Body

| name | type   | description |
| ---- | ------ | ----------- |
| name | string | role's name |

## Response

### Response Parameters

| name    | type    | description                  |
| ------- | ------- | ---------------------------- |
| powerby | string  | iSunFA v0.1.2+50             |
| success | boolean | true or false                |
| code    | string  | response code                |
| message | string  | description of response data |
| payload | Role    | response data                |

#### Role

| name        | type     | description            |
| ----------- | -------- | ---------------------- |
| id          | string   | role's id              |
| name        | string   | role's name            |
| companyId   | string   | id of the company      |
| companyName | string   | name of the company    |
| permissions | string[] | permission of the role |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": true,
  "code": "201",
  "message": "Created successfully",
  "payload": [
    {
      "id": "1",
      "name": "Bobie",
      "companyId": "1",
      "companyName": "mermer",
      "permissions": ["auditing_viewer"]
    }
  ]
}
```

- 失敗的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "405",
  "message": "Method not allowed",
  "payload": {}
}
```

# updateRoleById

- description: update role by id

## Request

### Request url

```typescript
PUT /company/:companyId/role/:roleId
```

### Request Example

```typescript
PUT / company / 1 / role / 1;

const body = {
  name: 'Bobie',
  companyId: '1',
  companyName: 'mermer',
  permissions: ['auditing_viewer'],
};
```

### Parameters

| name   | type   | description | require | default |
| ------ | ------ | ----------- | ------- | ------- |
| roleId | string | role id     | true    | -       |

### Body

| name        | type     | description            |
| ----------- | -------- | ---------------------- |
| name        | string   | role's name            |
| companyId   | string   | id of the company      |
| companyName | string   | name of the company    |
| permissions | string[] | permission of the role |

## Response

### Response Parameters

| name    | type    | description                  |
| ------- | ------- | ---------------------------- |
| powerby | string  | iSunFA v0.1.2+50             |
| success | boolean | true or false                |
| code    | string  | response code                |
| message | string  | description of response data |
| payload | Role    | response data                |

#### Role

| name        | type     | description            |
| ----------- | -------- | ---------------------- |
| id          | string   | role's id              |
| name        | string   | role's name            |
| companyId   | string   | id of the company      |
| companyName | string   | name of the company    |
| permissions | string[] | permission of the role |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": true,
  "code": "200",
  "message": "Update successfully",
  "payload": [
    {
      "id": "1",
      "name": "Bobie",
      "companyId": "1",
      "companyName": "mermer",
      "permissions": ["auditing_viewer"]
    }
  ]
}
```

- 失敗的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "405",
  "message": "Method not allowed",
  "payload": {}
}
```

# deleteRoleById

- description: delete role

## Request

### Request url

```typescript
DELETE /company/:companyId/role/:roleId
```

### Request Example

```typescript
DELETE / company / 1 / role / 1;
```

### Parameters

| name   | type   | description | require | default |
| ------ | ------ | ----------- | ------- | ------- |
| roleId | string | role id     | true    | -       |

## Response

### Response Parameters

| name    | type    | description                  |
| ------- | ------- | ---------------------------- |
| powerby | string  | iSunFA v0.1.2+50             |
| success | boolean | true or false                |
| code    | string  | response code                |
| message | string  | description of response data |
| payload | Role    | response data                |

#### Role

| name        | type     | description            |
| ----------- | -------- | ---------------------- |
| id          | string   | role's id              |
| name        | string   | role's name            |
| companyId   | string   | id of the company      |
| companyName | string   | name of the company    |
| permissions | string[] | permission of the role |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": true,
  "code": "200",
  "message": "Delete successfully",
  "payload": [
    {
      "id": "1",
      "name": "Bobie",
      "companyId": "1",
      "companyName": "mermer",
      "permissions": ["auditing_viewer"]
    }
  ]
}
```

- 失敗的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "405",
  "message": "Method not allowed",
  "payload": {}
}
```

# uploadJournalDocumentImage (ISFMK00015) (ISFMK00035)

## Description

Upload a document or image for an event, which will be processed to extract necessary information.
The API will return a `resultId` and `status` to track the OCR processing.

## Request

### URL

```
POST /company/:companyId/journals/document/upload
```

### Headers

| name         | type   | description                          | required | default |
| ------------ | ------ | ------------------------------------ | -------- | ------- |
| Content-Type | string | Should be set to multipart/form-data | true     | -       |

### Body

| name     | type | description                                | required | default |
| -------- | ---- | ------------------------------------------ | -------- | ------- |
| document | file | The document or image file to be processed | true     | -       |

## Response

### Response Parameters

| name    | type                | description                                    |
| ------- | ------------------- | ---------------------------------------------- |
| powerby | string              | The version of the API                         |
| success | boolean             | Whether the upload was successful              |
| code    | string              | The response code                              |
| message | string              | A message about the result of the upload       |
| payload | AccountResultStatus | Contains `resultId` and `status` of the upload |

AccountResultStatus

| name     | type                  | description                                                                                                |
| -------- | --------------------- | ---------------------------------------------------------------------------------------------------------- |
| resultId | string                | resultId for analyzing event                                                                               |
| status   | ProgressStatus (enum) | "success" \| "inProgress"\| "notFound" \| "alreadyUpload" \| "invalidInput" \| "llmError" \| "systemError" |

### Response Example

```json
{
  "powerby": "ISunFa API v1.0.0",
  "success": true,
  "code": "200",
  "message": "Document uploaded successfully, OCR processing started.",
  "payload": {
    "resultId": "1234567890abcdef",
    "status": "inProgress"
  }
}
```

# getJournalProcessingStatus (ISFMK00015) (ISFMK00035)

## Description

Check the current status of the OCR processing for a given `resultId`.

## Request

### URL

```
GET /company/:companyId/journals/document/status/:resultId
```

### Parameters

| name     | type   | description                                       | required | default |
| -------- | ------ | ------------------------------------------------- | -------- | ------- |
| resultId | string | The unique identifier for the OCR processing task | true     | -       |

## Response

### Response Parameters

| name    | type                  | description                                                                                                |
| ------- | --------------------- | ---------------------------------------------------------------------------------------------------------- |
| powerby | string                | The version of the API                                                                                     |
| success | boolean               | Whether the status retrieval was successful                                                                |
| code    | string                | The response code                                                                                          |
| message | string                | A message about the processing status                                                                      |
| payload | ProgressStatus (enum) | "success" \| "inProgress"\| "notFound" \| "alreadyUpload" \| "invalidInput" \| "llmError" \| "systemError" |

### Response Example

```json
{
  "powerby": "ISunFa API v1.0.0",
  "success": true,
  "code": "200",
  "message": "OCR processing status retrieved successfully.",
  "payload": "inProgress"
}
```

# getProcessedJournalData

## Description

Retrieve the data processed from the document/image upload, which can be used to create a new income
or expense line item.

## Request

### URL

```
GET /company/:companyId/journal/:journalId
```

### Parameters

| name      | type   | description                                          | required | default |
| --------- | ------ | ---------------------------------------------------- | -------- | ------- |
| journalId | string | The unique identifier for the processed journal data | true     | -       |

## Response

### Response Parameters

| name    | type        | description                           |
| ------- | ----------- | ------------------------------------- |
| powerby | string      | iSunFA v0.1.2+50                      |
| success | boolean     | true or false                         |
| code    | string      | response code                         |
| message | string      | description the status of the request |
| payload | JournalData | The data processed from the document  |

### JournalData

| name          | type               | description                                         |
| ------------- | ------------------ | --------------------------------------------------- |
| id            | string             | Unique identifier for the journal.                  |
| tokenContract | string             | The contract address for the token.                 |
| tokenId       | string             | Identifier for the specific token.                  |
| voucherIndex  | string             | Index of the voucher within a collection or series. |
| invoiceIndex  | string             | Index of the invoice associated with the voucher.   |
| metadatas     | IVoucherMetaData[] | Array of metadata associated with the voucher.      |
| lineItems     | LineItem[]         | Array of line items detailed in the voucher.        |

### IVoucherMetaData

| name        | type        | description                                      |
| ----------- | ----------- | ------------------------------------------------ |
| date        | number      | The date of the voucher.                         |
| voucherType | VoucherType | The type of the voucher                          |
| companyId   | string      | Identifier for the company.                      |
| companyName | string      | The name of the vendor or supplier.              |
| description | string      | A brief description of the voucher.              |
| reason      | string      | The reason for the payment.                      |
| projectId   | string      | Identifier for the related project.              |
| project     | string      | The name or description of the related project.  |
| contractId  | string      | Identifier for the related contract.             |
| contract    | string      | The name or description of the related contract. |
| payment     | Payment     | The payment details of the voucher.              |

### VoucherType(enum)

| name        | type         | description                      |
| ----------- | ------------ | -------------------------------- |
| VoucherType | string(enum) | 'receive', 'expense', 'transfer' |

### Payment

| name               | type                    | description                                                                                    |
| ------------------ | ----------------------- | ---------------------------------------------------------------------------------------------- |
| isRevenue          | boolean                 | Indicates if the transaction will generate income. True: money is coming in; false: going out. |
| price              | number                  | The total amount of money involved in the transaction.                                         |
| hasTax             | boolean                 | Specifies whether the amount includes tax.                                                     |
| taxPercentage      | number                  | The tax rate, for example, 0 or 5, etc.                                                        |
| hasFee             | boolean                 | Indicates whether there is a handling fee included.                                            |
| fee                | number                  | The amount of the handling fee.                                                                |
| paymentMethod      | string                  | The method by which money is received or paid out.                                             |
| paymentPeriod      | PaymentPeriodType       | The timing of payment, either at once (atOnce) or in installments (installment).               |
| installmentPeriod  | number                  | The number of installments for payment.                                                        |
| paymentAlreadyDone | number                  | The amount of money that has already been paid or collected.                                   |
| paymentStatus      | PaymentStatusType(enum) | The status of the payment. "paid" or "unpaid" or "partial"                                     |
| progress           | number                  | The actual work completion percentage for a contract, not referring to payment progress.       |

### PaymentPeriodType

| name              | type   | description             |
| ----------------- | ------ | ----------------------- |
| PaymentPeriodType | string | 'atOnce', 'installment' |

### PaymentStatusType

| name              | type   | description                 |
| ----------------- | ------ | --------------------------- |
| PaymentPeriodType | string | "paid", "unpaid", "partial" |

### LineItem

| name          | type    | description                                                |
| ------------- | ------- | ---------------------------------------------------------- |
| lineItemIndex | string  | The unique index of the line item entry.                   |
| account       | string  | The account associated with the line item.                 |
| description   | string  | A detailed description of the line item.                   |
| debit         | boolean | Indicates if the item is a debit (true) or credit (false). |
| amount        | number  | The monetary amount of the line item.                      |

### Response Example

- Success Response

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": true,
  "code": "200",
  "message": "Get successfully",
  "payload": {
    "id": "1",
    "tokenContract": "0x00000000219ab540356cBB839Cbe05303d7705Fa",
    "tokenId": "37002036",
    "voucherIndex": "1",
    "invoiceIndex": "1",
    "metadatas": [
      {
        "date": 1713139200000,
        "voucherType": "expense",
        "companyId": "1",
        "companyName": "文中資訊股份有限公司",
        "description": "WSTP會計師工作輔助幫手: 88725, 文中網路版主機授權費用: 8400, 文中工作站授權費用: 6300",
        "reason": "Equipment",
        "projectId": "1",
        "project": "BAIFA",
        "contractId": "1",
        "contract": "Contract123",
        "payment": {
          "isRevenue": false,
          "price": 109725,
          "hasTax": true,
          "taxPercentage": 5,
          "hasFee": false,
          "fee": 0,
          "paymentMethod": "transfer",
          "paymentPeriod": "atOnce",
          "installmentPeriod": 0,
          "paymentAlreadyDone": 0,
          "paymentStatus": "unpaid",
          "progress": 0
        }
      }
    ],
    "lineItems": [
      {
        "lineItemIndex": "20240402001",
        "account": "購買軟體",
        "description": "WSTP會計師工作輔助幫手: 88,725, 文中網路版主機授權費用: 8,400, 文中工作站授權費用: 6,300",
        "debit": true,
        "amount": 10450
      },
      {
        "lineItemIndex": "20240402002",
        "account": "銀行存款",
        "description": "WSTP會計師工作輔助幫手: 88,725, 文中網路版主機授權費用: 8,400, 文中工作站授權費用: 6,300",
        "debit": false,
        "amount": 10450
      }
    ]
  }
}
```

- Failure Response

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "404",
  "message": "Resource not found"
}
```

# createIncomeExpenseJournal (ISFMK00015) (ISFMK00035)

> 這邊很怪

## Description

Create a new Income or Expense event based on the user-adjusted data from the OCR-processed
document.

## Request

### URL

```
POST /company/:companyId/journals/add
```

### Headers

| name         | type   | description                     | required |
| ------------ | ------ | ------------------------------- | -------- |
| Content-Type | string | Must be set to application/json | true     |

### Body

| name           | type     | description                          | required | default |
| -------------- | -------- | ------------------------------------ | -------- | ------- |
| eventType      | string   | Type of event: "income" or "expense" | true     | -       |
| date           | string   | Date of the event (yyyy-mm-dd)       | true     | -       |
| reason         | string   | Reason for the event                 | true     | -       |
| vendorSupplier | string   | Vendor or supplier involved          | true     | -       |
| description    | string   | Description of the event             | true     | -       |
| total          | number   | Total price, tax, and fees           | true     | -       |
| paymentMethod  | string   | Payment method used                  | true     | -       |
| paymentPeriod  | string   | Payment period                       | true     | -       |
| paymentStatus  | string   | Payment status                       | true     | -       |
| project        | string   | Associated project name              | true     | -       |
| contract       | string   | Associated contract identifier       | false    | -       |
| accountVoucher | IVoucher | Voucher details                      | true     | -       |

### IVoucher

| name         | type               | description                                                              |
| ------------ | ------------------ | ------------------------------------------------------------------------ |
| invoiceIndex | string             | 可以到 invoice/:invoiceId/image取得圖片                                  |
| vouchIndex   | string             | index of vouch                                                           |
| metaDatas    | IVoucherMetaData[] |
| lineItem     | ILineItem\[\]      | Line items of voucher, each line item represent each line in irl voucher |

### IVoucherMetaData

| name        | type        | description                                      |
| ----------- | ----------- | ------------------------------------------------ |
| date        | number      | The date of the voucher.                         |
| voucherType | VoucherType | The type of the voucher                          |
| companyId   | string      | Identifier for the company.                      |
| companyName | string      | The name of the vendor or supplier.              |
| description | string      | A brief description of the voucher.              |
| reason      | string      | The reason for the payment.                      |
| projectId   | string      | Identifier for the related project.              |
| project     | string      | The name or description of the related project.  |
| contractId  | string      | Identifier for the related contract.             |
| contract    | string      | The name or description of the related contract. |
| payment     | Payment     | The payment details of the voucher.              |

### VoucherType(enum)

| name        | type         | description                      |
| ----------- | ------------ | -------------------------------- |
| VoucherType | string(enum) | 'receive', 'expense', 'transfer' |

### Payment

| name               | type                    | description                                                                                    |
| ------------------ | ----------------------- | ---------------------------------------------------------------------------------------------- |
| isRevenue          | boolean                 | Indicates if the transaction will generate income. True: money is coming in; false: going out. |
| price              | number                  | The total amount of money involved in the transaction.                                         |
| hasTax             | boolean                 | Specifies whether the amount includes tax.                                                     |
| taxPercentage      | number                  | The tax rate, for example, 0 or 5, etc.                                                        |
| hasFee             | boolean                 | Indicates whether there is a handling fee included.                                            |
| fee                | number                  | The amount of the handling fee.                                                                |
| paymentMethod      | string                  | The method by which money is received or paid out.                                             |
| paymentPeriod      | PaymentPeriodType       | The timing of payment, either at once (atOnce) or in installments (installment).               |
| installmentPeriod  | number                  | The number of installments for payment.                                                        |
| paymentAlreadyDone | number                  | The amount of money that has already been paid or collected.                                   |
| paymentStatus      | PaymentStatusType(enum) | The status of the payment. "paid" or "unpaid" or "partial"                                     |
| progress           | number                  | The actual work completion percentage for a contract, not referring to payment progress.       |

### PaymentPeriodType

| name              | type   | description             |
| ----------------- | ------ | ----------------------- |
| PaymentPeriodType | string | 'atOnce', 'installment' |

### PaymentStatusType

| name              | type   | description                 |
| ----------------- | ------ | --------------------------- |
| PaymentPeriodType | string | "paid", "unpaid", "partial" |

### ILineItem

| name          | type    | description                                                |
| ------------- | ------- | ---------------------------------------------------------- |
| lineItemIndex | string  | The unique index of the line item entry.                   |
| account       | string  | The account associated with the line item.                 |
| description   | string  | A detailed description of the line item.                   |
| debit         | boolean | Indicates if the item is a debit (true) or credit (false). |
| amount        | number  | The monetary amount of the line item.                      |

## Response

### Response Parameters

| name    | type    | description                               |
| ------- | ------- | ----------------------------------------- | ----- |
| powerby | string  | The version of the API                    |
| success | boolean | Whether the event creation was successful |
| code    | string  | The response code                         |
| message | string  | A message about the event creation        |
| payload | string  | success                                   | error |

### Response Example

- Success Response

```json
{
  "powerby": "ISunFa API v1.0.0",
  "success": true,
  "code": "201",
  "message": "Event created successfully.",
  "payload": "success"
}
```

- Failure Response

```json
{
  "powerby": "ISunFa API v1.0.0",
  "success": false,
  "code": "400",
  "message": "Failed to create event. Invalid data provided."
}
```

# getInvoice

## Description

Retrieve an image of a specific invoice.

## Request

### URL

```
GET /company/:companyId/invoice/:id
```

### Parameters

| name | type   | description                       | required |
| ---- | ------ | --------------------------------- | -------- |
| id   | string | Unique identifier for the invoice | true     |

### Request Example

```
GET /company/1/invoice/1
```

## Response

### Headers

The response will have the Content-Type header set to an image MIME type (like `image/jpeg` or
`image/png`) to indicate that an image is being returned.

### Response Body

The body of the response will be the binary data of the image.

### Response Example

The response will be the image file itself, not a JSON object.

# createOCRAnalyzingProcess

- description:

  - Post an image or multiples images in formData (all image need to use the key "image" and append
    to formData), will return a list of OCR `resultId` and `status` of OCR analyzed.
    - If you want to get all status of the uploaded image of certain company, you need to get from
      `GET /OCR` API.
    - `companyId` in the url has no use (can be any number or string), companyId will be retrieve
      from cookie instead

- logic flow:
  - 1. Check companyId from cookie is valid
  - 2. Post image to AICH for OCR analyzing
  - 3. Retrieve the resultId and status of OCR analyzed from AICH
  - 4. Create a row in `OCR` table in database to store the resultId, status of OCR analyzed and
       image related information
  - 5. Return a list of `resultId` and `status` of OCR analyzed
  - 6. **Warning**: this api won't create journal

## Request

### Request url

```
POST /company/:companyId/ocr
```

### Cookies

| name | type   | description                                                                                   | require | default |
| ---- | ------ | --------------------------------------------------------------------------------------------- | ------- | ------- |
| sid  | string | if using postman for testing, sid need to be provide in cookie, so that api can get companyId | true    | -       |

### Body

| name     | type     | description                                                                | require | default |
| -------- | -------- | -------------------------------------------------------------------------- | ------- | ------- |
| formData | FormData | Need to use `new FormData` to post invoice images (see example down below) | true    | -       |

formData內包含

| name  | type     | description                                                                                             | require | default |
| ----- | -------- | ------------------------------------------------------------------------------------------------------- | ------- | ------- |
| image | File\[\] | An array of Image To be analyze by ocr (請所有的image在formData的key都是"image", 或著直接上傳一個array) | true    | -       |

### Request Example

```ts
const formData = new FormData();
formData.append('image', [圖片1, 圖片2]);

// the URL of the uploaded image in the response
const response = await fetch('/invoice', {
  method: 'POST',
  body: formData,
});
```

## Response

### Response Parameters

| name    | type                     | description                                                  |
| ------- | ------------------------ | ------------------------------------------------------------ |
| powerby | string                   | ISunFa api 1.0.0                                             |
| success | boolean                  | true \| false                                                |
| code    | string                   | response code                                                |
| message | string                   | description of response data                                 |
| payload | IAccountResultStatus\[\] | Every image upload will return a set of id and result status |

AccountResultStatus

| name    | type                                                            | description                    |
| ------- | --------------------------------------------------------------- | ------------------------------ |
| reultId | string                                                          | result Id                      |
| status  | EventType Enum "invalidInput" \| "inProgress"\| "alreadyUpload" | status of current OCR ResultId |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.4+4",
  "success": true,
  "code": "201ISF0000",
  "message": "Created successfully",
  "payload": [
    {
      "resultId": "b6e8a6c6e70eb1c92bbd",
      "status": "inProgress"
    },
    {
      "resultId": "81d677209caaabbbccc",
      "status": "inProgress"
    }
  ]
}
```

如果上傳的invoice還存在AICH 則是alreadyUploaded

```json
{
  "powerby": "iSunFA v0.1.4+4",
  "success": true,
  "code": "201ISF0000",
  "message": "Created successfully",
  "payload": [
    {
      "resultId": "b6e8a6c6e70eb1c92bbd",
      "status": "alreadyUpload"
    },
    {
      "resultId": "81d677209caaabbbccc",
      "status": "alreadyUpload"
    }
  ]
}
```

- 失敗的回傳 (如果ISunFa連不上AICH的話)

```json
{
  "powerby": "iSunFA v1.0.0",
  "success": false,
  "code": "422ISF0000",
  "message": "Invalid input formdata image",
  "payload": {}
}
```

如果出現像是下面的 **Bad gateway** 的話則是AICH的問題

```json
{
  "powerby": "iSunFA v1.0.0",
  "success": false,
  "code": "502ISF0001",
  "message": "Bad gateway connect AICH failed",
  "payload": {}
}
```

# getUnprocessedOCR

## description:

- This API is mean to replace `/unprocess_journal`, it has same shape of response, but the Interface
  changed to `IUnprocessedOCR[]`
- This API can return all OCR process that are not yet bond to certain invoice, which means it will
  return the OCR that contain aichResultId, but have null value on `journalId` in database
- `companyId` in the url has no use (can be any number or string), companyId will be retrieve from
  cookie instead

-

## Request

### Request url

```typescript
GET`/company/:companyId/ocr`;
```

### Cookies

| name | type   | description                                                                                   | require | default |
| ---- | ------ | --------------------------------------------------------------------------------------------- | ------- | ------- |
| sid  | string | if using postman for testing, sid need to be provide in cookie, so that api can get companyId | true    | -       |

### Query

| name      | type   | description                                          | required | default |
| --------- | ------ | ---------------------------------------------------- | -------- | ------- |
| companyId | string | specific company number, will be used on query to db | yes      | -       |

### Request Example

```typescript
GET`/company/1/ocr`;
```

## Response

### Response Parameters

| name    | type     | description                  |
| ------- | -------- | ---------------------------- |
| powerby | string   | iSunFA v0.1.2+50             |
| success | boolean  | true or false                |
| code    | string   | response code                |
| message | string   | description of response data |
| payload | IOCR\[\] | response data or \[\]        |

### IOCR

| name         | type           | description                                                                                                                    |
| ------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| id           | number         | the unique identifier for the **journal**                                                                                      |
| aichResultId | string         | for asking result                                                                                                              |
| imageName    | string         | the name of image (contain File extension)                                                                                     |
| imageUrl     | string         | the url for frontend to show image                                                                                             |
| imageSize    | string         | the size of image, ex: "10 KB" or "10 MB", round to 2 below decimal point                                                      |
| progress.    | number         | 0~100 Integer, is count by (time already consumed)/(default average Ocr process time), will be set to 100 if status is success |
| status       | ProgressStatus | the status of OCR analyzing                                                                                                    |
| createdAt    | int            | timestamp in second                                                                                                            |

```ts
export interface IOCR {
  id: number;
  aichResultId: string;
  imageName: string;
  imageUrl: string;
  imageSize: number;
  progress: number; // 0 ~ 100 Int
  status: ProgressStatus;
  createdAt: number;
}
```

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.4+78",
  "success": true,
  "code": "200ISF0002",
  "message": "Get successfully",
  "payload": [
    {
      "id": 3,
      "aichResultId": "b6e8a6c6e70eb1c92bbd",
      "imageUrl": "/api/v1/company/0/invoice/621d30213185179d76ffa7e00.jpg/image",
      "imageName": "621d30213185179d76ffa7e00.jpg",
      "imageSize": "487.03 KB",
      "status": "systemError",
      "progress": 0,
      "createdAt": 1718594724
    }
  ]
}
```

- 失敗的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "500ISF0002",
    "message": "Database create failed",
    "payload": []
  }
  ```

# getOCRResult

> (This api need to migrate to microservice)

- Description Get Result of Invoice data processed by OCR recognition. Return single
  IInvoiceDataForSavingToDB

## Request

### Request url

```
GET /company/:companyId/ocr/:resultId
```

### Param

| name     | type   | description | require | default   |
| -------- | ------ | ----------- | ------- | --------- |
| resultId | string | resultId    | true    | undedined |

### Request Example

```
GET /company/1/ocr/b6e8a6c6e7
```

## Response

### Response Parameters

| name    | type                      | description                  |
| ------- | ------------------------- | ---------------------------- |
| powerby | string                    | ISunFa api 1.0.0             |
| success | boolean                   | true \| false                |
| code    | string                    | response code                |
| message | string                    | description of response data |
| payload | IInvoiceDataForSavingToDB | result of ocr analyzing      |

### IInvoiceDataForSavingToDB

| name             | type                      | description                                                                                                                               |
| ---------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| journalId        | null                      | The unique identifier for the journal that invoice belongs to. (But when ocr return, it doesn't know which journal it belong, so is null) |
| date             | number                    | The timestamp representing the date and time. (second)                                                                                    |
| eventType        | EventType                 | The type of event ('income', 'payment', 'transfer').                                                                                      |
| paymentReason    | string                    | The reason for the payment.                                                                                                               |
| description      | string                    | A description of the transaction.                                                                                                         |
| venderOrSupplier | string                    | The name of the vendor or supplier involved.                                                                                              |
| projectId        | string (always be "None") | The identifier for the project. (return "None" due to the fact that aich hasn't fix yet )                                                 |
| project          | string (always be "None") | The name of the project. (return "None" due to the fact that aich hasn't fix yet )                                                        |
| contractId       | string (always be "None") | The unique identifier for the contract. (return "None" due to the fact that aich hasn't fix yet )                                         |
| contract         | string (always be "None") | The name or title of the contract. (return "None" due to the fact that aich hasn't fix yet )                                              |
| payment          | Payment                   | A object containing payment details.                                                                                                      |

### Payment

| name               | type                     | description                                                                                    |
| ------------------ | ------------------------ | ---------------------------------------------------------------------------------------------- |
| isRevenue          | boolean                  | Indicates if the transaction will generate income. True: money is coming in; false: going out. |
| price              | number                   | The total amount of money involved in the transaction.                                         |
| hasTax             | boolean                  | Specifies whether the amount includes tax.                                                     |
| taxPercentage      | number                   | The tax rate, for example, 0 or 5, etc.                                                        |
| hasFee             | boolean                  | Indicates whether there is a handling fee included.                                            |
| fee                | number                   | The amount of the handling fee.                                                                |
| paymentMethod      | string                   | The method by which money is received or paid out.                                             |
| paymentPeriod      | PaymentPeriodType (enum) | The timing of payment, either at once (atOnce) or in installments (installment).               |
| installmentPeriod  | number                   | The number of installments for payment.                                                        |
| paymentAlreadyDone | number                   | The amount of money that has already been paid or collected.                                   |
| paymentStatus      | PaymentStatusType(enum)  | The status of the payment. "paid" or "unpaid" or "partial                                      |
| progress           | number                   | The actual work completion percentage for a contract, not referring to payment progress.       |

```ts
export interface IInvoiceDataForSavingToDB {
  journalId: number | null;
  date: number; // timestamp, second
  eventType: EventType;
  paymentReason: string;
  description: string;
  vendorOrSupplier: string;
  projectId: string | null;
  project: string | null;
  contractId: string | null;
  contract: string | null;
  payment: IPayment;
}
```

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.4+10",
  "success": true,
  "code": "200ISF0000",
  "message": "Success",
  "payload": {
    "date": 1713052800,
    "eventType": "payment",
    "paymentReason": "購買商品相關作業",
    "description": "",
    "vendorOrSupplier": "誠品股份有限公司中山書街分公司",
    "project": "None",
    "contract": "None",
    "projectId": "None",
    "contractId": "None",
    "payment": {
      "isRevenue": false,
      "price": 1500,
      "hasTax": false,
      "taxPercentage": 5,
      "hasFee": true,
      "fee": 45,
      "paymentMethod": "LinePay",
      "paymentPeriod": "atOnce",
      "installmentPeriod": 0,
      "paymentAlreadyDone": 1500,
      "paymentStatus": "paid",
      "progress": 0
    },
    "journalId": null
  }
}
```

- 失敗的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": true,
  "code": "400",
  "message": "Reason why api request failed"
}
```

# deleteOCRbyResultId

- description: delete OCR by resultId

## Request

### Request url

```typescript
DELETE /company/:companyId/ocr/:result
```

### Request Example

```typescript
DELETE / company / 1 / ocr / b6e8a6c6e7;
```

## Response

### Response Parameters

| name    | type    | description                  |
| ------- | ------- | ---------------------------- |
| powerby | string  | ISunFa api 1.0.0             |
| success | boolean | true or false                |
| code    | string  | response code                |
| message | string  | description of response data |
| payload | IOCR    | response data                |

### Response Example

- 成功的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": true,
  "code": "200",
  "message": "delete successfully",
  "payload": {
    "id": 3,
    "aichResultId": "b6e8a6c6e70eb1c92bbd",
    "imageUrl": "/api/v1/company/0/invoice/621d30213185179d76ffa7e00.jpg/image",
    "imageName": "621d30213185179d76ffa7e00.jpg",
    "imageSize": "487.03 KB",
    "status": "systemError",
    "progress": 0,
    "createdAt": 1718594724
  }
}
```

- 失敗的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": false,
  "code": "422",
  "message": "invalid input parameter",
  "payload": null
}
```

# listCard

- description: list all card

## Request

### Request url

```typescript
GET /company/:companyId/card
```

### Request Example

```typescript
GET / company / 1 / card;
```

## Response

### Response Parameters

| name    | type    | description                  |
| ------- | ------- | ---------------------------- |
| powerby | string  | ISunFa api 1.0.0             |
| success | boolean | true or false                |
| code    | string  | response code                |
| message | string  | description of response data |
| payload | card[]  | response data                |

#### card

| name        | type   | description   |
| ----------- | ------ | ------------- |
| id          | string | card's id     |
| type        | string | card's type   |
| no          | string | card's number |
| expireYear  | string | expire year   |
| expireMonth | string | expire month  |
| cvc         | string | card's cvc    |
| name        | string | card name     |

### Response Example

- 成功的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": true,
  "code": "200",
  "message": "list all cards",
  "payload": [
    {
      "id": "1",
      "type": "VISA",
      "no": "1234-1234-1234-1234",
      "expireYear": "29",
      "expireMonth": "01",
      "cvc": "330",
      "name": "Taiwan Bank"
    },
    {
      "id": "2",
      "type": "VISA",
      "no": "5678-5678-5678-5678",
      "expireYear": "29",
      "expireMonth": "01",
      "cvc": "355",
      "name": "Taishin International Bank"
    }
  ]
}
```

- 失敗的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": false,
  "code": "500",
  "message": "internal server error",
  "payload": null
}
```

# getCardById

- description: get card by id

## Request

### Request url

```typescript
GET /company/:companyId/card/:id
```

### Request Example

```typescript
GET / company / 1 / card / 1;
```

## Response

### Response Parameters

| name    | type    | description                  |
| ------- | ------- | ---------------------------- |
| powerby | string  | ISunFa api 1.0.0             |
| success | boolean | true or false                |
| code    | string  | response code                |
| message | string  | description of response data |
| payload | card    | response data                |

#### card

| name        | type   | description   |
| ----------- | ------ | ------------- |
| id          | string | card's id     |
| type        | string | card's type   |
| no          | string | card's number |
| expireYear  | string | expire year   |
| expireMonth | string | expire month  |
| cvc         | string | card's cvc    |
| name        | string | card name     |

### Response Example

- 成功的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": true,
  "code": "200",
  "message": "get card by id",
  "payload": {
    "id": "1",
    "type": "VISA",
    "no": "1234-1234-1234-1234",
    "expireYear": "29",
    "expireMonth": "01",
    "cvc": "330",
    "name": "Taiwan Bank"
  }
}
```

- 失敗的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": false,
  "code": "422",
  "message": "invalid input parameter",
  "payload": null
}
```

# createcard

- description: create card in ISF

## Request

### Request url

```typescript
POST /company/:companyId/card
```

### body

| name        | type   | description   | required | default |
| ----------- | ------ | ------------- | -------- | ------- |
| type        | string | card's type   | true     | -       |
| no          | string | card's number | true     | -       |
| expireYear  | string | expire year   | true     | -       |
| expireMonth | string | expire month  | true     | -       |
| cvc         | string | card's cvc    | true     | -       |
| name        | string | card name     | true     | -       |

### Request Example

```typescript
POST / company / 1 / card;

const body = {
  type: 'VISA',
  no: '1234-1234-1234-1234',
  expireYear: '29',
  expireMonth: '01',
  cvc: '330',
  name: 'Taiwan Bank',
};
```

## Response

### Response Parameters

| name    | type    | description                  |
| ------- | ------- | ---------------------------- |
| powerby | string  | ISunFa api 1.0.0             |
| success | boolean | true or false                |
| code    | string  | response code                |
| message | string  | description of response data |
| payload | card    | response data                |

#### card

| name        | type   | description   |
| ----------- | ------ | ------------- |
| id          | string | card's id     |
| type        | string | card's type   |
| no          | string | card's number |
| expireYear  | string | expire year   |
| expireMonth | string | expire month  |
| cvc         | string | card's cvc    |
| name        | string | card name     |

### Response Example

- 成功的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": true,
  "code": "200",
  "message": "create card successfully",
  "payload": {
    "id": "1",
    "type": "VISA",
    "no": "1234-1234-1234-1234",
    "expireYear": "29",
    "expireMonth": "01",
    "cvc": "330",
    "name": "Taiwan Bank"
  }
}
```

- 失敗的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": false,
  "code": "422",
  "message": "invalid input parameter",
  "payload": null
}
```

# deleteCardById

- description: delete card by id

## Request

### Request url

```typescript
DELETE /company/:companyId/card/:id
```

### Request Example

```typescript
DELETE / company / 1 / card / 1;
```

## Response

### Response Parameters

| name    | type    | description                  |
| ------- | ------- | ---------------------------- |
| powerby | string  | ISunFa api 1.0.0             |
| success | boolean | true or false                |
| code    | string  | response code                |
| message | string  | description of response data |
| payload | card    | response data                |

#### card

| name        | type   | description   |
| ----------- | ------ | ------------- |
| id          | string | card's id     |
| type        | string | card's type   |
| no          | string | card's number |
| expireYear  | string | expire year   |
| expireMonth | string | expire month  |
| cvc         | string | card's cvc    |
| name        | string | card name     |

### Response Example

- 成功的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": true,
  "code": "200",
  "message": "delete card {id} sucessfully",
  "payload": {
    "id": "1",
    "type": "VISA",
    "no": "1234-1234-1234-5678",
    "expireYear": "29",
    "expireMonth": "01",
    "cvc": "330",
    "name": "Taiwan Bank"
  }
}
```

- 失敗的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": false,
  "code": "422",
  "message": "invalid input parameter",
  "payload": null
}
```

# createNewProject

- Description: Create a new project with the specified details including the project name, stage,
  and team members.

## Request

### Request URL

```
POST /company/:companyId/project
```

### Body

### newProject

| name    | type     | description                          |
| ------- | -------- | ------------------------------------ |
| name    | string   | name of the project                  |
| stage   | string   | current stage of the project         |
| members | string[] | list of usernames of project members |

### Request Example

```typescript
POST / company / 1 / project;

const body = {
  name: 'Project 3',
  stage: 'Designing',
  members: ['Bob', 'John'],
};
```

## Response

### Response Parameters

| name    | type             | description                              |
| ------- | ---------------- | ---------------------------------------- |
| powerby | string           | iSunFA v0.1.2+50                         |
| success | boolean          | Indicates if the API call was successful |
| code    | string           | HTTP response code                       |
| message | string           | Description of the response              |
| payload | newProject \| {} | project object or {}                     |

### newProject

| name    | type     | description                          |
| ------- | -------- | ------------------------------------ |
| name    | string   | name of the project                  |
| stage   | string   | current stage of the project         |
| members | string[] | list of usernames of project members |

### Response Example

- Success Response

```typescript
{
  "powerby": "iSunFA v0.1.2+50",
  "success": true,
  "code": "200",
  "message": "create project",
  "payload": {
    "name": "Project 3",
    "stage": "Designing",
    "members": ["Bob", "John"]
  }
}
```

- Failure Response

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "400",
  "message": error.message,
  "payload": {}
}
```

# getProjectContracts

- Description: Retrieve a list of contracts associated with a specific project, with pagination
  support.

## Request

### Request URL

```
GET /company/:companyId/project/:projectId/contracts
```

### URL Parameters

| name | type   | description                       | required | default |
| ---- | ------ | --------------------------------- | -------- | ------- |
| id   | string | Unique identifier for the project | true     | -       |

### Query Parameters

| name      | type      | description                                                                                                                   | required | default   |
| --------- | --------- | ----------------------------------------------------------------------------------------------------------------------------- | -------- | --------- |
| page      | number    | Page number of the contracts list                                                                                             | false    | 1         |
| limit     | number    | Number of contracts to return per page                                                                                        | false    | 10        |
| status    | string    | return contracts that on certain stage<br>("designing" \| "developing" \| "betaTesting" \| "selling" \| "sold" \| "archived") | false    | undefined |
| sort      | string    | if not provided or provided "desc", will be sort by descent, provide other words will be sort by absent                       | false    | desc      |
| startDate | timestamp | false                                                                                                                         | today    |
| endDate   | timestamp | false                                                                                                                         | today    |

### Request Example

```
GET /company/1/project/baifa/contracts?page=2&limit=5&status=designing&sort=asc
```

## Response

### Response Parameters

| name    | type               | description                                                   |
| ------- | ------------------ | ------------------------------------------------------------- |
| powerby | string             | Version of the API powering the request                       |
| success | boolean            | Indicates if the API call was successful                      |
| code    | string             | HTTP response code                                            |
| message | string             | Description of the response                                   |
| payload | contractGetAllType | Object containing the list of contracts and meta of page info |

contractGetAllType

| name        | type         | description               |
| ----------- | ------------ | ------------------------- |
| projectId   | string       | id of project             |
| projectName | string.      | name of project.          |
| contracts   | Contract\[\] | Array of contract objects |
| pageMeta    | PageMeta     | Pagination metadata       |

Contract

| name              | type   | description                                                                          |
| ----------------- | ------ | ------------------------------------------------------------------------------------ |
| contractId.       | string | id of the contract                                                                   |
| contractName      | string | Name of the contract                                                                 |
| signatory         | string | Name of the signatory of the contract                                                |
| status            | string | Current status of the contract (e.g., 'valid \| inWarrenty \|inProgress \| expired') |
| paymentReceivable | number | Payment of total Receivable                                                          |
| paymentReceived   | number | Payment of actually received                                                         |
| startDate         | string | Start date of the contract (yyyy-mm-dd)                                              |
| endDate           | string | End date of the contract (yyyy-mm-dd)                                                |
| progress          | string | Progress percentage of the contract                                                  |

PageMeta

| name        | type   | description                         |
| ----------- | ------ | ----------------------------------- |
| currentPage | number | The current page number             |
| totalPages  | number | The total number of pages available |
| totalItems  | number | The total number of items available |

### Response Example

- Success Response

```json
{
  "powerby": "ISunFa API v1.0.0",
  "success": true,
  "code": "200",
  "message": "Contracts retrieved successfully",
  "payload": {
    "projectId": "123456",
    "projectName": "BAIFA"
    "contracts": [
      {
       "contractId": "123456",
        "contractName": "Contract Name",
        "signatory": "Predovic - Beahan",
        "status": "Valid",
        "paymentReceivable": 5600,
        "paymentReceived" : 10000,
        "startDate": "2024-03-27",
        "endDate": "2025-03-26",
        "progress": "25%"
      },
      // ... additional contracts
    ]
    "pageMeta": {
	  "currentPage": 2,
      "totalPages": 20,
      "totalItems": 85
    }
  },
}
```

- Failure Response

```json
{
  "powerby": "ISunFa API v1.0.0",
  "success": false,
  "code": "404",
  "message": "Project not found or you do not have permission to view the contracts"
}
```

# getProjectVouchers

- Description: Retrieve a paginated list of vouchers associated with a specific project, with
  various filtering and search capabilities. **This api only provide information for Uploaded/
  Upcoming Events, not all voucher information will be provided**

## Request

### Request URL

```
GET /company/:companyId/project/:projectId/vouchers
```

### Parameters

| name      | type   | description                       | required |
| --------- | ------ | --------------------------------- | -------- |
| projectId | string | Unique identifier for the project | true     |

### Query

| name       | type   | description                                                                   | required | default |
| ---------- | ------ | ----------------------------------------------------------------------------- | -------- | ------- |
| page       | number | Page number of the accounting events list                                     | false    | 1       |
| limit      | number | Number of accounting events to return per page                                | false    | 10      |
| type       | string | Type of the accounting events to filter by                                    | false    | -       |
| contract   | string | Filter events by contract name or identifier                                  | false    | -       |
| start_date | string | For searching period for the events, start_date included. Format:(YYYY-MM-DD) | false    | -       |
| end_date   | string | For searching period for the events, end_date included. Format:(YYYY-MM-DD)   | false    | -       |
| search     | string | Search term for the events                                                    | false    | -       |

### Request Example

```
GET /company/1/project/baifa/vouchers?page=2&limit=5&type=payment&contract=Contract1&start_date=2024-01-01&end_date2024-12-31&search=apple
```

## Response

### Response Parameters

| name    | type               | description                                                           |
| ------- | ------------------ | --------------------------------------------------------------------- |
| powerby | string             | Version of the API powering the request                               |
| success | boolean            | Indicates if the API call was successful                              |
| code    | string             | HTTP response code                                                    |
| message | string             | Description of the response                                           |
| payload | contractGetAllType | Object containing the list of accounting events and meta data of page |

Payload

| name             | type              | description                       |
| ---------------- | ----------------- | --------------------------------- |
| accountingEvents | AccountingEvent[] | Array of accounting event objects |
| pageMeta         | PageMeta          | Pagination metadata               |

AccountingEvent

| name        | type   | description                                |
| ----------- | ------ | ------------------------------------------ |
| date        | string | Date of the accounting event (yyyy-mm-dd)  |
| type        | string | Type of the accounting event               |
| particulars | string | Details about the accounting event         |
| fromTo      | string | The corresponding party or account         |
| amount      | number | Amount involved in the event               |
| contract    | string | Associated contract name or identifier     |
| operation   | string | Operation performed (e.g., 'transmitting') |

PageMeta

| name        | type   | description                         |
| ----------- | ------ | ----------------------------------- |
| currentPage | number | The current page number             |
| totalPages  | number | The total number of pages available |
| totalItems  | number | The total number of items available |

### Response Example

- Success Response

```json
{
  "powerby": "ISunFa API v1.0.0",
  "success": true,
  "code": "200",
  "message": "Accounting events retrieved successfully",
  "payload": {
    "accountingEvents": [
      {
        "date": "2024-02-20",
        "type": "Payment",
        "particulars": "Buy an apple",
        "fromTo": "PX Mart",
        "amount": 100,
        "contract": "Contract1",
        "operation": "transmitting"
      },
      // ... additional events
    ]

    "pageMeta": {
	  "currentPage": 2,
	  "totalPages": 17,
	  "totalItems": 85
    }
  },
}
```

- Failure Response

```json
{
  "powerby": "ISunFa API v1.0.0",
  "success": false,
  "code": "404",
  "message": "Project not found or you do not have permission to view the accounting events"
}
```

# createAsset

## Description

Create a new asset that will automatically depreciate over time and generate the appropriate
accounting vouchers.

## Request

### URL

```
POST /company/:companyId/asset
```

### Headers

| name         | type   | description                     | required |
| ------------ | ------ | ------------------------------- | -------- |
| Content-Type | string | Must be set to application/json | true     |

### Body

| name                | type   | description                                          | required | default |
| ------------------- | ------ | ---------------------------------------------------- | -------- | ------- |
| voucherId           | number | The voucher id that the asset is associated with     | true     | -       |
| projectId           | number | The project id that the asset is associated with     | true     | -       |
| contractId          | number | The contract id that the asset is associated with    | true     | -       |
| name                | string | The name of the asset                                | true     | -       |
| label               | string | The lable of the asset                               | true     | -       |
| type                | string | The type of the asset                                | true     | -       |
| description         | string | A description of the asset                           | true     | -       |
| supplier            | string | The supplier of the asset                            | true     | -       |
| startDate           | string | The start date the asset was purchased, (YYYY-MM-DD) | true     | -       |
| endDate             | string | The end date the asset was purchased, (YYYY-MM-DD)   | true     | -       |
| price               | string | The purchase price of the asset                      | true     | -       |
| residualValue       | string | The residual value of the asset                      | true     | -       |
| depreciationMethod  | string | The method of depreciation                           | true     | -       |
| estimatedUsefulLife | number | The estimated useful life in months                  | true     | -       |

### Request Example

```json
{
  "voucherId": 123456,
  "projectId": 123456,
  "contractId": 123456,
  "name": "mac",
  "tag": "computer",
  "type": "liquid",
  "description": "asset discription",
  "startDate": "2024-01-01",
  "endDate": "2024-11-01",
  "price": 20,
  "residualValue": 15,
  "depreciationMethod": "stright",
  "estimatedUsefulLife": 36
}
```

## Response

### Response Parameters

| name    | type    | description                               |
| ------- | ------- | ----------------------------------------- |
| powerby | string  | The version of the API                    |
| success | boolean | Whether the asset creation was successful |
| code    | string  | The response code                         |
| message | string  | A message about the asset creation        |
| payload | Asset   | The details of the created asset          |

Asset

| name                | type   | description                                                             |
| ------------------- | ------ | ----------------------------------------------------------------------- |
| id                  | number | asset id                                                                |
| voucherId           | number | The voucher id that the asset is associated with                        |
| projectId           | number | The project id that the asset is associated with                        |
| contractId          | number | The contract id that the asset is associated with                       |
| name                | string | The name of the asset                                                   |
| label               | string | The label of the asset                                                  |
| type                | string | The type of the asset                                                   |
| description         | string | A description of the asset                                              |
| supplier            | string | The supplier of the asset                                               |
| startDate           | number | The start date the asset was purchased, (YYYY-MM-DD)                    |
| endDate             | number | The end date the asset was purchased, (YYYY-MM-DD)                      |
| price               | number | The purchase price of the asset                                         |
| residualValue       | number | The residual value of the asset                                         |
| depreciationMethod  | string | The method of depreciation                                              |
| estimatedUsefulLife | number | The estimated useful life in months                                     |
| createdAt           | number | The timestamp representing the date and time the asset was created      |
| updatedAt           | number | The timestamp representing the date and time the asset was last updated |

### Response Example

- Success Response

```json
{
  "powerby": "ISunFa API v1.0.0",
  "success": true,
  "code": "201",
  "message": "Asset created successfully.",
  "payload": {
    "id": 123456,
    "voucherId": 123456,
    "projectId": 123456,
    "contractId": 123456,
    "name": "mac",
    "label": "computer",
    "type": "liquid",
    "description": "asset description",
    "supplier": "apple",
    "startDate": "2024-01-01",
    "endDate": "2024-11-01",
    "price": 20,
    "residualValue": 15,
    "depreciationMethod": "stright",
    "estimatedUsefulLife": 36,
    "createdAt": 1713052800,
    "updatedAt": 1713052800
  }
}
```

- Failure Response

```json
{
  "powerby": "ISunFa API v1.0.0",
  "success": false,
  "code": "400",
  "message": "Failed to create asset. Invalid data provided."
}
```

# listAsset

- Description: Retrieve a list of assets associated with a specific project, with pagination
  support.

## Request

### URL

```
GET /company/:companyId/asset
```

### Headers

| name         | type   | description                     | required |
| ------------ | ------ | ------------------------------- | -------- |
| Content-Type | string | Must be set to application/json | true     |

## Response

### Response Parameters

| name    | type    | description                               |
| ------- | ------- | ----------------------------------------- |
| powerby | string  | The version of the API                    |
| success | boolean | Whether the asset creation was successful |
| code    | string  | The response code                         |
| message | string  | A message about the asset creation        |
| payload | Asset   | The details of the created asset          |

Asset

| name                | type   | description                                                             |
| ------------------- | ------ | ----------------------------------------------------------------------- |
| id                  | number | asset id                                                                |
| voucherId           | number | The voucher id that the asset is associated with                        |
| projectId           | number | The project id that the asset is associated with                        |
| contractId          | number | The contract id that the asset is associated with                       |
| name                | string | The name of the asset                                                   |
| label               | string | The label of the asset                                                  |
| type                | string | The type of the asset                                                   |
| description         | string | A description of the asset                                              |
| supplier            | string | The supplier of the asset                                               |
| startDate           | number | The start date the asset was purchased, (YYYY-MM-DD)                    |
| endDate             | number | The end date the asset was purchased, (YYYY-MM-DD)                      |
| price               | number | The purchase price of the asset                                         |
| residualValue       | number | The residual value of the asset                                         |
| depreciationMethod  | string | The method of depreciation                                              |
| estimatedUsefulLife | number | The estimated useful life in months                                     |
| createdAt           | number | The timestamp representing the date and time the asset was created      |
| updatedAt           | number | The timestamp representing the date and time the asset was last updated |

### Response Example

- Success Response

```json
{
  "powerby": "ISunFa API v1.0.0",
  "success": true,
  "code": "200",
  "message": " Asset created successfully.",
  "payload": {
    "id": 123456,
    "voucherId": 123456,
    "projectId": 123456,
    "contractId": 123456,
    "name": "mac",
    "label": "computer",
    "type": "liquid",
    "description": "asset description",
    "startDate": "2024-01-01",
    "endDate": "2024-11-01",
    "price": 20,
    "residualValue": 15,
    "depreciationMethod": "stright",
    "estimatedUsefulLife": 36,
    "createdAt": 1713052800,
    "updatedAt": 1713052800
  }
}
```

- Failure Response

```json
{
  "powerby": "ISunFa API v1.0.0",
  "success": false,
  "code": "400",
  "message": "Failed to create asset. Invalid data provided."
}
```

# getAsset

## Description

Retrieve the details of a specific asset for review or editing.

## Request

### URL

```
GET /company/:companyId/asset/:assetId
```

### URL Parameters

| name | type   | description                     | required |
| ---- | ------ | ------------------------------- | -------- |
| id   | string | Unique identifier for the asset | true     |

## Response

### Response Parameters

| name    | type    | description                          |
| ------- | ------- | ------------------------------------ |
| powerby | string  | The version of the API               |
| success | boolean | Whether the retrieval was successful |
| code    | string  | The response code                    |
| message | string  | A message about the retrieval        |
| payload | Asset   | The details of the requested asset   |

Asset (as defined in POST)

## Response Example

- Success Response

```json
{
  "powerby": "ISunFa API v1.0.0",
  "success": true,
  "code": "200",
  "message": " Asset details retrieved successfully.",
  "payload": {
    "id": 123456,
    "voucherId": 123456,
    "projectId": 123456,
    "contractId": 123456,
    "name": "mac",
    "label": "computer",
    "type": "liquid",
    "description": "asset description",
    "supplier": "apple",
    "startDate": "2024-01-01",
    "endDate": "2024-11-01",
    "price": 20,
    "residualValue": 15,
    "depreciationMethod": "stright",
    "estimatedUsefulLife": 36,
    "createdAt": 1713052800,
    "updatedAt": 1713052800
  }
}
```

- Failure Response

```json
{
  "powerby": "ISunFa API v1.0.0",
  "success": false,
  "code": "404",
  "message": " Asset not found."
}
```

# updateAsset

## Description

Update the details of an existing asset.

## Request

### URL

```
PUT /company/:companyId/asset/:id
```

### URL Parameters

| name | type   | description                     | required |
| ---- | ------ | ------------------------------- | -------- |
| id   | string | Unique identifier for the asset | true     |

### Body Parameters

### Body

| name                | type   | description                                          | required | default |
| ------------------- | ------ | ---------------------------------------------------- | -------- | ------- |
| voucherId           | number | The voucher id that the asset is associated with     | true     | -       |
| projectId           | number | The project id that the asset is associated with     | true     | -       |
| contractId          | number | The contract id that the asset is associated with    | true     | -       |
| name                | string | The name of the asset                                | true     | -       |
| label               | string | The label of the asset                               | true     | -       |
| type                | string | The type of the asset                                | true     | -       |
| description         | string | A description of the asset                           | true     | -       |
| supplier            | string | The supplier of the asset                            | true     | -       |
| startDate           | string | The start date the asset was purchased, (YYYY-MM-DD) | true     | -       |
| endDate             | string | The end date the asset was purchased, (YYYY-MM-DD)   | true     | -       |
| price               | string | The purchase price of the asset                      | true     | -       |
| residualValue       | string | The residual value of the asset                      | true     | -       |
| depreciationMethod  | string | The method of depreciation                           | true     | -       |
| estimatedUsefulLife | number | The estimated useful life in months                  | true     | -       |

### Request Example

```json
{
  "voucherId": 123456,
  "projectId": 123456,
  "contractId": 123456,
  "name": "mac",
  "tag": "computer",
  "type": "liquid",
  "description": "asset discription",
  "startDate": "2024-01-01",
  "endDate": "2024-11-01",
  "price": 20,
  "residualValue": 15,
  "depreciationMethod": "stright",
  "estimatedUsefulLife": 36
}
```

## Response

### Response Parameters

Same as the POST response parameters.

### Response Example

- Success Response

```json
{
  "powerby": "ISunFa API v1.0.0",
  "success": true,
  "code": "200",
  "message": " Asset updated successfully.",
  "payload": {
    "id": 123456,
    "voucherId": 123456,
    "projectId": 123456,
    "contractId": 123456,
    "name": "mac",
    "label": "computer",
    "type": "liquid",
    "description": "asset description",
    "supplier": "apple",
    "startDate": "2024-01-01",
    "endDate": "2024-11-01",
    "price": 20,
    "residualValue": 15,
    "depreciationMethod": "stright",
    "estimatedUsefulLife": 36,
    "createdAt": 1713052800,
    "updatedAt": 1713052800
  }
}
```

- Failure Response

```json
{
  "powerby": "ISunFa API v1.0.0",
  "success": false,
  "code": "400",
  "message": "Failed to update asset. Invalid data provided."
}
```

# askAiStatus

- description: `GET voucher/status` now has been integrated into this api, by providing query of
  `aiApi=vouchers`, it will return ProgressStatus of voucher

## Request

### Request url

```typescript
GET /company/:companyId/ask_ai/:resultId/status?aiApi=
```

### Params

| name     | type   | description          | required |
| -------- | ------ | -------------------- | -------- |
| resultId | string | the id of the result | true     |

### Query

| name   | type   | description                                             | required |
| ------ | ------ | ------------------------------------------------------- | -------- |
| aiApi. | string | the api that will call AICH, use `vouchers` for voucher | true     |

### Request Example

```
GET /api/v1/company/:companyId/ask_ai/:resultId/status?aiApi=vouchers
```

### Response

| name    | type           | description                                   |
| ------- | -------------- | --------------------------------------------- |
| powerby | string         | iSunFA v0.1.2+50                              |
| success | boolean        | true or false                                 |
| code    | string         | response code                                 |
| message | string         | description the status of the request         |
| payload | ProgressStatus | array of id and progress status of the result |

### ProgressStatus

| name                 | type   | description                                                                                     |
| -------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| ProgressStatus(enum) | string | 'success', 'inProgress', 'notFound', 'alreadyUpload', 'invalidInput', 'llmError', 'systemError' |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.4+10",
  "success": true,
  "code": "200ISF0002",
  "message": "Get successfully",
  "payload": "success"
}
```

- 失敗的回傳如果 `aiApi` 填入的值 aich沒有相對應的api就會出現下面的樣子

```json
{
  "powerby": "iSunFA v0.1.4+10",
  "success": false,
  "code": "404ISF0002",
  "message": "AICH API not found",
  "payload": {}
}
```

# askAiResult

- description: integrate `/voucher/:voucherId` into this api, by providing query of
  `aiApi=vouchers`, it will return IVoucherDataForSavingToDB

## Request

### Request url

```typescript
GET /company/:companyId/ask_ai/:resultId?aiApi=
```

### Params

| name     | type   | description          | required |
| -------- | ------ | -------------------- | -------- |
| resultId | string | the id of the result | true     |

### Query

| name   | type   | description                                             | required |
| ------ | ------ | ------------------------------------------------------- | -------- |
| aiApi. | string | the api that will call AICH, use `vouchers` for voucher | true     |

### Request Example

```
GET /api/v1/company/:companyId/ask_ai/:resultId?aiApi=vouchers
```

### Response

| name    | type    | description                                                                         |
| ------- | ------- | ----------------------------------------------------------------------------------- |
| powerby | string  | iSunFA v0.1.2+50                                                                    |
| success | boolean | true or false                                                                       |
| code    | string  | response code                                                                       |
| message | string  | description the status of the request                                               |
| payload | any     | Depend on which `aiApi` you provide, return IVoucherDataForSavingToDB if "vouchers" |

### IVoucherDataForSavingToDB

| name      | type          | description                                                                                                                                                      |
| --------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| journalId | null          | this value will be return in this api, since `IVoucherDataForSavingToDB` is both using in POST and get voucher, journalId will only be used when POSTing voucher |
| lineItem  | ILineItem\[\] | Line items of voucher, each line item represent each line in irl voucher                                                                                         |

### ILineItem

| name          | type    | description                                                                                                                                     |
| ------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| lineItemIndex | string  | The unique index of the line item entry. But this has no actual meaning, just random response from aich, real id will be number and store in db |
| account       | string  | The account associated with the line item.                                                                                                      |
| description   | string  | A detailed description of the line item.                                                                                                        |
| debit         | boolean | Indicates if the item is a debit (true) or credit (false).                                                                                      |
| amount        | number  | The monetary amount of the line item.                                                                                                           |

### Response Example

- 成功的回傳If providing `aiApi=voucher`:

```json
{
  "powerby": "iSunFA v0.1.4+10",
  "success": true,
  "code": "200ISF0002",
  "message": "Get successfully",
  "payload": {
    "lineItems": [
      {
        "lineItemIndex": "'20240426001'",
        "account": "'電信費'",
        "description": "'光世代電路月租費： 593, HiNet企業專案服務費: 1607'",
        "debit": true,
        "amount": 2210
      },
      {
        "lineItemIndex": "'20240325002'",
        "account": "'進項稅額'",
        "description": "'WSTP會計師工作輔助幡: 88,725, 文中網路版主機授權費用: 8,400, 文中工作站授權費用: 6,300'",
        "debit": true,
        "amount": 110
      },
      {
        "lineItemIndex": "'20240426003'",
        "account": "'銀行存款'",
        "description": "'合庫銀行'",
        "debit": false,
        "amount": 2310
      }
    ]
  }
}
```

- 失敗的回傳如果 `aiApi` 填入的值 aich沒有相對應的api就會出現下面的樣子

```json
{
  "powerby": "iSunFA v0.1.4+10",
  "success": false,
  "code": "404ISF0002",
  "message": "AICH API not found",
  "payload": {}
}
```

# listSubscription

- description: list subscription

## Request

### Request url

```typescript
GET /company/:companyId/subscription
```

### Request Example

```typescript
GET / company / 1 / subscribe;
```

## Response

### Response Parameters

| name    | type           | description                  |
| ------- | -------------- | ---------------------------- |
| powerby | string         | ISunFa api 1.0.0             |
| success | boolean        | true or false                |
| code    | string         | response code                |
| message | string         | description of response data |
| payload | subscription[] | response data                |

#### subscription

| name       | type    | description                |
| ---------- | ------- | -------------------------- |
| id         | string  | subscription's id          |
| company    | string  | company's name             |
| plan       | string  | subscription's plan        |
| cardId     | string  | cardId for subscription    |
| price      | string  | subscription's price       |
| autoRenew  | boolean | autoRenew subscription     |
| expireDate | string  | subscription's expire date |
| status     | boolean | subscription's status      |

### Response Example

- 成功的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": true,
  "code": "200",
  "message": "list subscription",
  "payload": [
    {
      "id": "1",
      "company": "mermer",
      "plan": "pro",
      "cardId": "1",
      "price": "USD 10",
      "autoRenew": true,
      "expireDate": "2024-01-01",
      "status": "paid"
    }
  ]
}
```

- 失敗的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": false,
  "code": "500",
  "message": "internal server error",
  "payload": null
}
```

# createSubscription

- description: create subscription in ISF

## Request

### Request url

```typescript
POST /company/:companyId/subscription
```

### body

| name        | type    | description             | required | default |
| ----------- | ------- | ----------------------- | -------- | ------- |
| plan        | string  | subscription's plan     | true     | -       |
| cardId      | string  | card's id               | true     | -       |
| autoRenewal | boolean | auto renew subscription | false    | true    |

### Request Example

```typescript
POST / company / 1 / subscription;

const body = {
  plan: 'pro',
  cardId: '1',
  autoRenewal: true,
};
```

## Response

### Response Parameters

| name    | type         | description                  |
| ------- | ------------ | ---------------------------- |
| powerby | string       | ISunFa api 1.0.0             |
| success | boolean      | true or false                |
| code    | string       | response code                |
| message | string       | description of response data |
| payload | subscription | response data                |

#### subscription

| name       | type    | description                |
| ---------- | ------- | -------------------------- |
| id         | string  | subscription's id          |
| company    | string  | company's name             |
| plan       | string  | subscription's plan        |
| cardId     | string  | cardId for subscription    |
| price      | string  | subscription's price       |
| autoRenew  | boolean | autoRenew subscription     |
| expireDate | string  | subscription's expire date |
| status     | boolean | subscription's status      |

### Response Example

- 成功的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": true,
  "code": "200",
  "message": "create subscription",
  "payload": {
    "id": "1",
    "company": "mermer",
    "plan": "pro",
    "cardId": "1",
    "price": "USD 10",
    "autoRenew": true,
    "expireDate": "2024-01-01",
    "status": "paid"
  }
}
```

- 失敗的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": false,
  "code": "422",
  "message": "invalid input parameter",
  "payload": null
}
```

# updateSubscriptionById

- description: update subscription by id

## Request

### Request url

```typescript
PUT /company/:companyId/subscription/:id
```

### body

| name        | type    | description             | required | default |
| ----------- | ------- | ----------------------- | -------- | ------- |
| plan        | string  | subscription's plan     | true     | -       |
| cardId      | string  | card's id               | true     | -       |
| autoRenewal | boolean | auto renew subscription | false    | true    |

### Request Example

```typescript
POST / company / 1 / subscription / 1;

const body = {
  plan: 'team',
  cardId: '1',
  autoRenewal: true,
};
```

## Response

### Response Parameters

| name    | type         | description                  |
| ------- | ------------ | ---------------------------- |
| powerby | string       | ISunFa api 1.0.0             |
| success | boolean      | true or false                |
| code    | string       | response code                |
| message | string       | description of response data |
| payload | subscription | response data                |

#### subscription

| name       | type    | description                |
| ---------- | ------- | -------------------------- |
| id         | string  | subscription's id          |
| company    | string  | company's name             |
| plan       | string  | subscription's plan        |
| cardId     | string  | cardId for subscription    |
| price      | string  | subscription's price       |
| autoRenew  | boolean | autoRenew subscription     |
| expireDate | string  | subscription's expire date |
| status     | boolean | subscription's status      |

### Response Example

- 成功的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": true,
  "code": "200",
  "message": "update subscription",
  "payload": {
    "id": "1",
    "company": "mermer",
    "plan": "team",
    "cardId": "1",
    "price": "USD 10",
    "autoRenew": true,
    "expireDate": "2024-01-01",
    "status": "paid"
  }
}
```

- 失敗的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": false,
  "code": "422",
  "message": "invalid input parameter",
  "payload": null
}
```

# deleteSubscriptionById

- description: delete subscription by id

## Request

### Request url

```typescript
DELETE /company/:companyId/subscription/:id
```

### Request Example

```typescript
DELETE / company / 1 / subscription / 1;
```

## Response

### Response Parameters

| name    | type         | description                  |
| ------- | ------------ | ---------------------------- |
| powerby | string       | ISunFa api 1.0.0             |
| success | boolean      | true or false                |
| code    | string       | response code                |
| message | string       | description of response data |
| payload | subscription | response data                |

#### subscription

| name       | type    | description                |
| ---------- | ------- | -------------------------- |
| id         | string  | subscription's id          |
| company    | string  | company's name             |
| plan       | string  | subscription's plan        |
| cardId     | string  | cardId for subscription    |
| price      | string  | subscription's price       |
| autoRenew  | boolean | autoRenew subscription     |
| expireDate | string  | subscription's expire date |
| status     | boolean | subscription's status      |

### Response Example

- 成功的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": true,
  "code": "200",
  "message": "delete subscription",
  "payload": {
    "id": "1",
    "company": "mermer",
    "plan": "team",
    "cardId": "1",
    "price": "USD 10",
    "autoRenew": true,
    "expireDate": "2024-01-01",
    "status": "paid"
  }
}
```

- 失敗的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": false,
  "code": "422",
  "message": "invalid input parameter",
  "payload": null
}
```

# getSubscriptionReceiptById

- description: get subscription receipt by id

## Request

### Request url

```typescript
GET /company/:companyId/subscription/:id/receipt
```

### Request Example

```typescript
GET / company / 1 / subscription / 1 / receipt;
```

## Response

### Response Parameters

| name    | type    | description                  |
| ------- | ------- | ---------------------------- |
| powerby | string  | ISunFa api 1.0.0             |
| success | boolean | true or false                |
| code    | string  | response code                |
| message | string  | description of response data |
| payload | receipt | response data                |

#### receipt

| name    | type | description            |
| ------- | ---- | ---------------------- |
| receipt | file | subscription's receipt |

### Response Example

- 成功的回傳

```json
{
    "powerby": "ISunFa api 1.0.0",
    "success": true,
    "code":  "200",
    "message": "return subscription's receipt",
    "payload": {
          "receipt":file,
        },
}
```

- 失敗的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": false,
  "code": "500",
  "message": "intenal server error",
  "payload": null
}
```

# companyKYC

- description: KYC for entity

## Request

### Request url

```typescript
POST /company/:companyId/kyc
```

### body

| name     | type     | description          | required | default |
| -------- | -------- | -------------------- | -------- | ------- |
| formData | FormData | FormData of kyc info | true     | -       |

### formData

| name                    | type   | description              | required | default |
| ----------------------- | ------ | ------------------------ | -------- | ------- |
| legalName               | string | entity's name            | true     | -       |
| country                 | string | country                  | true     | -       |
| city                    | string | city                     | true     | -       |
| address                 | string | entity's address         | true     | -       |
| zipCode                 | string | zip code                 | true     | -       |
| representativeName      | string | representative's name    | true     | -       |
| registerCountry         | string | register country         | true     | -       |
| structure               | string | structure                | true     | -       |
| registrationNumber      | string | registration number      | true     | -       |
| registrationDate        | string | registration date        | true     | -       |
| industry                | string | registration industry    | true     | -       |
| contactPerson           | string | contact person name      | true     | -       |
| contactPhone            | string | contact phone            | true     | -       |
| contactEmail            | string | contact email            | true     | -       |
| website                 | string | website                  | false    | -       |
| registrationCertificate | file   | registration certificate | true     | -       |
| taxCertificate          | file   | tax certificate          | true     | -       |
| representativeIdType    | string | representative id type   | true     | -       |
| representativeIdCard    | file   | representative id        | true     | -       |

### Request Example

```typescript
POST / company / 1 / kyc;

const formData = new FormData();
formData.append('legalName', 'mermer');
formData.append('country', 'Taiwan');
formData.append('city', 'Taipei');
formData.append('address', '106-Taipei-xinyi road');
formData.append('zipCode', '106');
formData.append('representativeName', 'bob');
formData.append('registerCountry', 'Taiwan');
formData.append('structure', 'company');
formData.append('registrationNumber', '123456');
formData.append('registrationDate', '2021-01-01');
formData.append('industry', 'IT');
formData.append('contactPerson', 'bob');
formData.append('contactPhone', '0912345678');
formData.append('contactEmail', 'bob@mermer.cc');
formData.append('website', 'www.mermer.cc');
formData.append('registrationCertificate', file);
formData.append('taxCertificate', file);
formData.append('representativeIdType', 'passport');
formData.append('representativeIdCard', file);

const body = formData;
```

## Response

### Response Parameters

| name    | type       | description                  |
| ------- | ---------- | ---------------------------- |
| powerby | string     | ISunFa api 1.0.0             |
| success | boolean    | true or false                |
| code    | string     | response code                |
| message | string     | description of response data |
| payload | companyKYC | response data                |

### companyKYC

| name                      | type   | description                 |
| ------------------------- | ------ | --------------------------- |
| id                        | string | companyKYC's id             |
| companyId                 | string | company's id                |
| legalName                 | string | entity's name               |
| country                   | string | country                     |
| city                      | string | city                        |
| address                   | string | entity's address            |
| zipCode                   | string | zip code                    |
| representativeName        | string | representative's name       |
| structure                 | string | structure                   |
| registrationNumber        | string | registration number         |
| registrationDate          | string | registration date           |
| industry                  | string | registration industry       |
| contactPerson             | string | contact person name         |
| contactPhone              | string | contact phone               |
| contactEmail              | string | contact email               |
| website                   | string | website                     |
| representativeIdType      | string | representative id type      |
| registrationCertificateId | string | registration certificate id |
| taxCertificateId          | string | tax certificate id          |
| representativeIdCardId    | string | representative id card id   |
| createdAt                 | number | create time                 |
| updatedAt                 | number | update time                 |

### Response Example

- 成功的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": true,
  "code": "200",
  "message": "KYC for entity",
  "payload": {
    "id": "1",
    "companyId": "1",
    "legalName": "mermer",
    "country": "Taiwan",
    "city": "Taipei",
    "address": "106-Taipei-xinyi road",
    "zipCode": "106",
    "representativeName": "bob",
    "structure": "company",
    "registrationNumber": "123456",
    "registrationDate": "2021-01-01",
    "industry": "IT",
    "contactPerson": "bob",
    "contactPhone": "0912345678",
    "contactEmail": "bob@mermer.cc",
    "website": "www.mermer.cc",
    "representativeIdType": "passport",
    "registrationCertificateId": "1",
    "taxCertificateId": "2",
    "representativeIdCardId": "3",
    "createdAt": 123456,
    "updatedAt": 123456
  }
}
```

- 失敗的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": false,
  "code": "422",
  "message": "invalid input parameter",
  "payload": {}
}
```

# getAuditReports

- description: This API provides the functionality to query financial reports information of various
  companies.

## Request

### Request url

```typescript
GET / audit_report;
```

### Query

| name   | type   | description                                         | required | default |
| ------ | ------ | --------------------------------------------------- | -------- | ------- |
| region | string | only return results for a specific region           | no       | -       |
| page   | string | specify the page number of results to return        | no       | 1       |
| limit  | string | the maximum number of results to return per page    | no       | 10      |
| begin  | string | only return results after this date(timestamp)      | no       | -       |
| end    | string | only return results before this date(timestamp)     | no       | -       |
| search | string | only return results that include a specific keyword | no       | -       |

### Request Example

- example 1

```typescript
GET`/audit_report`;
```

- example 2

```typescript
GET`/audit_report?&begin=1713755682&search=DA 1175`;
```

## Response

### Response Parameters

| name    | type                   | description                  |
| ------- | ---------------------- | ---------------------------- |
| powerby | string                 | iSunFA v0.1.2+50             |
| success | boolean                | true or false                |
| code    | string                 | response code                |
| message | string                 | description of response data |
| payload | AuditReports[] \| null | array of response data       |

### AuditReports

| name                | type   | description                    |
| ------------------- | ------ | ------------------------------ |
| id                  | number | unique id of the report        |
| code                | string | company code                   |
| regional            | string | region of the company          |
| company             | string | company name                   |
| companyId           | number | unique id of the company       |
| informationYear     | string | financial report year          |
| detailedInformation | string | detailed financial report name |
| creditRating        | string | credit rating                  |
| dateOfUpload        | string | date of upload                 |
| link                | string | URL link                       |

### Response Example

- example 2
  - 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.5+19",
  "success": true,
  "code": "200ISF0002",
  "message": "Get successfully",
  "payload": [
    {
      "id": 1,
      "companyId": 8867,
      "code": "20206111752",
      "regional": "Taiwan",
      "company": "CNN",
      "informationYear": "2024 Q1",
      "detailedInformation": "Cash Flow Balance Sheet-20240423-1-20240420-1",
      "creditRating": "AA",
      "dateOfUpload": "1713815673",
      "link": "https: //BFample.com/download/report.pdf"
    },
    {
      "id": 3,
      "companyId": 8867,
      "code": "20206111752",
      "regional": "Taiwan",
      "company": "CNN",
      "informationYear": "2024 Q3",
      "detailedInformation": "Balance Sheet-20240427-1",
      "creditRating": "AAA",
      "dateOfUpload": "1714220640",
      "link": "https: //BFample.com/download/report.pdf"
    },
    {
      "id": 4,
      "companyId": 8867,
      "code": "20206111752",
      "regional": "Taiwan",
      "company": "CNN",
      "informationYear": "2024 Q4",
      "detailedInformation": "Comprehensive Income Statement-20240422-1",
      "creditRating": "C",
      "dateOfUpload": "1713755682",
      "link": "https: //BFample.com/download/report.pdf"
    },
    {
      "id": 5,
      "companyId": 8867,
      "code": "20206111752",
      "regional": "Taiwan",
      "company": "CNN",
      "informationYear": "DAILY",
      "detailedInformation": "Balance Sheet-20240429-1",
      "creditRating": "BB",
      "dateOfUpload": "1714331987",
      "link": "https: //BFample.com/download/report.pdf"
    },
    {
      "id": 6,
      "companyId": 6146,
      "code": "國立政治大學",
      "regional": "Taiwan",
      "company": "國立政治大學",
      "informationYear": "DAILY",
      "detailedInformation": "Balance Sheet-20240429-1",
      "creditRating": "BB",
      "dateOfUpload": "1714331987",
      "link": "https: //BFample.com/download/report.pdf"
    }
  ]
}
```

    - 失敗的回傳

    ```json
    {
        "powerby": "iSunFA v0.1.2+50",
        "success": false,
        "code":  "400",
        "message": "bad request",
        "payload": null
    }
    ```

# getPeriodProfitTrend

- description: This API provides the functionality to query % of total income, expenses and profit
  within the designed period.

## Request

### Request url

```typescript
GET`/company/:companyId/profit_trend`;
```

### Query

| name   | type   | description          | required | default |
| ------ | ------ | -------------------- | -------- | ------- |
| period | string | the period displayed | no       | week    |

### Request Example

- example

```typescript
GET`/company/1/profit_trend?period=week`;
```

## Response

### Response Parameters

| name    | type                    | description                  |
| ------- | ----------------------- | ---------------------------- |
| powerby | string                  | iSunFA v0.1.2+50             |
| success | boolean                 | true or false                |
| code    | string                  | response code                |
| message | string                  | description of response data |
| payload | ProfitPercent[] \| null | array of response data       |

### ProfitPercent

| name     | type   | description                       |
| -------- | ------ | --------------------------------- |
| income   | number | % of the income within the date   |
| expenses | number | % of the expenses within the date |
| date     | date   | the date within the period        |
| profit   | number | % of the profit within the date   |

### Response Example

- 成功的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": true,
    "code": "200",
    "message": "Get successfully",
    "payload": [
      {
        "date": "2024-03-01",
        "income": 0.7,
        "expenses": 0.5,
        "profit": 0.2
      },
      {
        "date": "2024-03-02",
        "income": 0.2,
        "expenses": 0.13,
        "profit": 0.07
      },
      {
        "date": "2024-03-03",
        "income": 0.3,
        "expenses": 0.2,
        "profit": 0.1
      },
      {
        "date": "2024-03-04",
        "income": 0.1,
        "expenses": 0.05,
        "profit": 0.05
      },
      {
        "date": "2024-03-05",
        "income": 0.05,
        "expenses": 0.03,
        "profit": 0.02
      },
      {
        "date": "2024-03-06",
        "income": 0.1,
        "expenses": 0.08,
        "profit": 0.02
      },
      {
        "date": "2024-03-07",
        "income": 0.2,
        "expenses": 0.15,
        "profit": 0.05
      }
    ]
  }
  ```
- 失敗的回傳

  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "422",
    "message": "Invalid input parameter",
    "payload": {}
  }
  ```

# listAllVouchers

- Description: List all vouchers that have been created

## Request

### Request url

```
GET /company/:companyId/vouchers`
```

### Query

| name  | type   | description                                  | require | default |
| ----- | ------ | -------------------------------------------- | ------- | ------- |
| page  | number | which page of voucher you want to get        | false   | 1       |
| limit | number | how many voucher you want to get in one page | false   | 10      |

### Request Example

```
GET /company/1/voucher?page=1&limit=10
```

## Response

### Response Parameters

| name    | type       | description                  |
| ------- | ---------- | ---------------------------- |
| powerby | string     | ISunFa api 1.0.0             |
| success | boolean    | true \| false                |
| code    | string     | response code                |
| message | string     | description of response data |
| payload | IVoucher[] | voucher review               |

### IVoucher

| name         | type               | description                                                              |
| ------------ | ------------------ | ------------------------------------------------------------------------ |
| invoiceIndex | string             | 可以到 invoice/:invoiceId/image取得圖片                                  |
| vouchIndex   | string             | index of vouch                                                           |
| metaDatas    | IVoucherMetaData[] |
| lineItem     | ILineItem\[\]      | Line items of voucher, each line item represent each line in irl voucher |

### IVoucherMetaData

| name        | type        | description                                      |
| ----------- | ----------- | ------------------------------------------------ |
| date        | number      | The date of the voucher.                         |
| voucherType | VoucherType | The type of the voucher                          |
| companyId   | string      | Identifier for the company.                      |
| companyName | string      | The name of the vendor or supplier.              |
| description | string      | A brief description of the voucher.              |
| reason      | string      | The reason for the payment.                      |
| projectId   | string      | Identifier for the related project.              |
| project     | string      | The name or description of the related project.  |
| contractId  | string      | Identifier for the related contract.             |
| contract    | string      | The name or description of the related contract. |
| payment     | Payment     | The payment details of the voucher.              |

### VoucherType(enum)

| name        | type         | description                      |
| ----------- | ------------ | -------------------------------- |
| VoucherType | string(enum) | 'receive', 'expense', 'transfer' |

### Payment

| name               | type                    | description                                                                                    |
| ------------------ | ----------------------- | ---------------------------------------------------------------------------------------------- |
| isRevenue          | boolean                 | Indicates if the transaction will generate income. True: money is coming in; false: going out. |
| price              | number                  | The total amount of money involved in the transaction.                                         |
| hasTax             | boolean                 | Specifies whether the amount includes tax.                                                     |
| taxPercentage      | number                  | The tax rate, for example, 0 or 5, etc.                                                        |
| hasFee             | boolean                 | Indicates whether there is a handling fee included.                                            |
| fee                | number                  | The amount of the handling fee.                                                                |
| paymentMethod      | string                  | The method by which money is received or paid out.                                             |
| paymentPeriod      | PaymentPeriodType       | The timing of payment, either at once (atOnce) or in installments (installment).               |
| installmentPeriod  | number                  | The number of installments for payment.                                                        |
| paymentAlreadyDone | number                  | The amount of money that has already been paid or collected.                                   |
| paymentStatus      | PaymentStatusType(enum) | The status of the payment. "paid" or "unpaid" or "partial"                                     |
| progress           | number                  | The actual work completion percentage for a contract, not referring to payment progress.       |

### PaymentPeriodType

| name              | type   | description             |
| ----------------- | ------ | ----------------------- |
| PaymentPeriodType | string | 'atOnce', 'installment' |

### PaymentStatusType

| name              | type   | description                 |
| ----------------- | ------ | --------------------------- |
| PaymentPeriodType | string | "paid", "unpaid", "partial" |

### ILineItem

| name          | type    | description                                                |
| ------------- | ------- | ---------------------------------------------------------- |
| lineItemIndex | string  | The unique index of the line item entry.                   |
| account       | string  | The account associated with the line item.                 |
| description   | string  | A detailed description of the line item.                   |
| debit         | boolean | Indicates if the item is a debit (true) or credit (false). |
| amount        | number  | The monetary amount of the line item.                      |

### Response Example

- 成功的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": true,
  "code": "200",
  "message": "List of vouchers return successfully",
  "payload": [
    {
      "voucherIndex": "20240402299",
      "metadatas": [
        {
          "date": 1713139200000,
          "voucherType": "expense",
          "venderOrSupplyer": "文中資訊股份有限公司",
          "description": "WSTP會計師工作輔助幫手: 88725, 文中網路版主機授權費用: 8400, 文中工作站授權費用: 6300",
          "totalPrice": 109725,
          "taxPercentage": 5,
          "fee": 0,
          "paymentMethod": "transfer",
          "paymentPeriod": "atOnce",
          "installmentPeriod": 0,
          "paymentStatus": "unpaid",
          "alreadyPaidAmount": 0
        }
      ],
      "lineItems": [
        {
          "lineItemIndex": "20240402001",
          "accounting": "購買軟體",
          "particular": "WSTP會計師工作輔助幫手: 88,725, 文中網路版主機授權費用: 8,400, 文中工作站授權費用: 6,300",
          "debit": true,
          "amount": 10450
        },
        {
          "lineItemIndex": "20240402002",
          "accounting": "銀行存款",
          "particular": "WSTP會計師工作輔助幫手: 88,725, 文中網路版主機授權費用: 8,400, 文中工作站授權費用: 6,300",
          "debit": false,
          "amount": 10450
        }
      ]
    }
  ]
}
```

- 失敗的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": false,
  "code": "400",
  "message": "Reason why request has failed"
}
```

# getVoucherById

- Description: Get voucher by providing `[voucherId]`

## Request

### Request url

```
GET /company/:companyId/voucher/:voucherId
```

### Parameters

| name      | type   | description | require | default |
| --------- | ------ | ----------- | ------- | ------- |
| voucherId | string | voucher id  | true    | -       |

### Request Example

```
GET /company/1/voucher/1229001
```

## Response

### Response Parameters

| name    | type     | description                           |
| ------- | -------- | ------------------------------------- |
| powerby | string   | iSunFA v0.1.2+50                      |
| success | boolean  | true or false                         |
| code    | string   | response code                         |
| message | string   | description the status of the request |
| payload | IVoucher | voucher review                        |

### IVoucher

| name         | type               | description                                                              |
| ------------ | ------------------ | ------------------------------------------------------------------------ |
| invoiceIndex | string             | 可以到 invoice/:invoiceId/image取得圖片                                  |
| vouchIndex   | string             | index of vouch                                                           |
| metaDatas    | IVoucherMetaData[] |
| lineItem     | ILineItem\[\]      | Line items of voucher, each line item represent each line in irl voucher |

### IVoucherMetaData

| name        | type        | description                                      |
| ----------- | ----------- | ------------------------------------------------ |
| date        | number      | The date of the voucher.                         |
| voucherType | VoucherType | The type of the voucher                          |
| companyId   | string      | Identifier for the company.                      |
| companyName | string      | The name of the vendor or supplier.              |
| description | string      | A brief description of the voucher.              |
| reason      | string      | The reason for the payment.                      |
| projectId   | string      | Identifier for the related project.              |
| project     | string      | The name or description of the related project.  |
| contractId  | string      | Identifier for the related contract.             |
| contract    | string      | The name or description of the related contract. |
| payment     | Payment     | The payment details of the voucher.              |

### VoucherType(enum)

| name        | type         | description                      |
| ----------- | ------------ | -------------------------------- |
| VoucherType | string(enum) | 'receive', 'expense', 'transfer' |

### Payment

| name               | type                    | description                                                                                    |
| ------------------ | ----------------------- | ---------------------------------------------------------------------------------------------- |
| isRevenue          | boolean                 | Indicates if the transaction will generate income. True: money is coming in; false: going out. |
| price              | number                  | The total amount of money involved in the transaction.                                         |
| hasTax             | boolean                 | Specifies whether the amount includes tax.                                                     |
| taxPercentage      | number                  | The tax rate, for example, 0 or 5, etc.                                                        |
| hasFee             | boolean                 | Indicates whether there is a handling fee included.                                            |
| fee                | number                  | The amount of the handling fee.                                                                |
| paymentMethod      | string                  | The method by which money is received or paid out.                                             |
| paymentPeriod      | PaymentPeriodType       | The timing of payment, either at once (atOnce) or in installments (installment).               |
| installmentPeriod  | number                  | The number of installments for payment.                                                        |
| paymentAlreadyDone | number                  | The amount of money that has already been paid or collected.                                   |
| paymentStatus      | PaymentStatusType(enum) | The status of the payment. "paid" or "unpaid" or "partial"                                     |
| progress           | number                  | The actual work completion percentage for a contract, not referring to payment progress.       |

### PaymentPeriodType

| name              | type   | description             |
| ----------------- | ------ | ----------------------- |
| PaymentPeriodType | string | 'atOnce', 'installment' |

### PaymentStatusType

| name              | type   | description                 |
| ----------------- | ------ | --------------------------- |
| PaymentPeriodType | string | "paid", "unpaid", "partial" |

### ILineItem

| name          | type    | description                                                |
| ------------- | ------- | ---------------------------------------------------------- |
| lineItemIndex | string  | The unique index of the line item entry.                   |
| account       | string  | The account associated with the line item.                 |
| description   | string  | A detailed description of the line item.                   |
| debit         | boolean | Indicates if the item is a debit (true) or credit (false). |
| amount        | number  | The monetary amount of the line item.                      |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": true,
  "code": "200",
  "message": "Get successfully",
  "payload": {
    "voucherIndex": "20240402299",
    "invoiceIndex": "1",
    "metadatas": [
      {
        "date": 1713139200000,
        "voucherType": "expense",
        "companyId": "1",
        "companyName": "文中資訊股份有限公司",
        "description": "WSTP會計師工作輔助幫手: 88725, 文中網路版主機授權費用: 8400, 文中工作站授權費用: 6300",
        "reason": "Equipment",
        "projectId": "1",
        "project": "BAIFA",
        "contractId": "1",
        "contract": "Contract123",
        "payment": {
          "isRevenue": false,
          "price": 109725,
          "hasTax": true,
          "taxPercentage": 5,
          "hasFee": false,
          "fee": 0,
          "paymentMethod": "transfer",
          "paymentPeriod": "atOnce",
          "installmentPeriod": 0,
          "paymentAlreadyDone": 0,
          "paymentStatus": "unpaid",
          "progress": 0
        }
      }
    ],
    "lineItems": [
      {
        "lineItemIndex": "20240402001",
        "account": "購買軟體",
        "description": "WSTP會計師工作輔助幫手: 88,725, 文中網路版主機授權費用: 8,400, 文中工作站授權費用: 6,300",
        "debit": true,
        "amount": 10450
      },
      {
        "lineItemIndex": "20240402002",
        "account": "銀行存款",
        "description": "WSTP會計師工作輔助幫手: 88,725, 文中網路版主機授權費用: 8,400, 文中工作站授權費用: 6,300",
        "debit": false,
        "amount": 10450
      }
    ]
  }
}
```

- 失敗的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "502",
  "message": "Bad gateway data from AICH is invalid type",
  "payload": {}
}
```

# createAVoucher

- Description:
  - **Warning**: The lineItem that post to voucher is using it's "account" to connect to the account
    in database, means that api will search the account by the "account" name that match the
    "account" in lineItem, if not found, it will use "其他費用".
  - Save voucher data into database, POST body need to be `IVoucherDataForSavingToDB` Type, It will
    create voucher and related line items in database, and return the created result.
  - `companyId` in the url has no use (can be any number or string), companyId will be retrieve from
    cookie instead
  - logic flow:
    - 1. Check companyId from cookie
    - 2. Check and Format Body to IVoucherDataForSavingToDB
    - 3. Create a new voucher
    - 4. Create a new line item for the voucher, and connect to the voucher
    - 5. Return voucher (type will be Prisma.voucher)

## Request

### Request url

```
POST /company/:companyId/voucher
```

### Cookies

| name | type   | description                                                                                   | require | default |
| ---- | ------ | --------------------------------------------------------------------------------------------- | ------- | ------- |
| sid  | string | if using postman for testing, sid need to be provide in cookie, so that api can get companyId | true    | -       |

### Body

| name    | type                      | description                                                     | require |
| ------- | ------------------------- | --------------------------------------------------------------- | ------- |
| voucher | IVoucherDataForSavingToDB | read down below, this combine two data, journalId and lineItems | true    |

#### IVoucherDataForSavingToDB

| name      | type        | description                                                       | require  |
| --------- | ----------- | ----------------------------------------------------------------- | -------- |
| journalId | number      | the index of journal that will be connect to new voucher          | **true** |
| lineItems | ILineItem[] | the line items of the voucher (ILineItems need to have accountId) | true     |

### Request Example

```
POST /company/1/voucher
```

Body: JSON type

```json
{
  "voucher": {
    "journalId": 15,
    "lineItems": [
      {
        "lineItemIndex": "'20240426001'",
        "account": "'電信費'",
        "description": "'光世代電路月租費： 593, HiNet企業專案服務費: 1607'",
        "debit": true,
        "amount": 2210,
        "accountId": 1
      },
      {
        "lineItemIndex": "'20240325002'",
        "account": "'進項稅額'",
        "description": "'WSTP會計師工作輔助幡: 88,725, 文中網路版主機授權費用: 8,400, 文中工作站授權費用: 6,300'",
        "debit": true,
        "amount": 110,
        "accountId": 2
      },
      {
        "lineItemIndex": "'20240426003'",
        "account": "'銀行存款'",
        "description": "'合庫銀行'",
        "debit": false,
        "amount": 2310,
        "accountId": 3
      }
    ]
  }
}
```

## Response

### Response Parameters

| name    | type                | description                                                      |
| ------- | ------------------- | ---------------------------------------------------------------- |
| powerby | string              | iSunFA v0.1.2+50                                                 |
| success | boolean             | true or false                                                    |
| code    | string              | response code                                                    |
| message | string              | description the status of the request                            |
| payload | Custom type \| null | the shape of data has no interface, but it follow Prisma.voucher |

#### payload custom type

| name      | type                      | description                                                                          |
| --------- | ------------------------- | ------------------------------------------------------------------------------------ |
| id        | string                    | the id of the **voucher** that was created                                           |
| journalId | number                    | the journal that the voucher connect to                                              |
| no        | string                    | the voucher serial number, it will increase base on company, format is `YYYYMMDD001` |
| createdAt | number                    | the timestamp of the voucher created (timestamp in second)                           |
| updatedAt | number                    | the timestamp of the voucher updated (timestamp in second)                           |
| lineItems | Prisma.LineItem[] \| null | the lineItems that was created                                                       |

#### Prisma.LineItem

| name        | type    | description                                                 |
| ----------- | ------- | ----------------------------------------------------------- |
| id          | number  | the id of the lineItem                                      |
| amount      | number  | the amount of the lineItem                                  |
| description | string  | the description of the lineItem                             |
| debit       | boolean | is debit or credit                                          |
| accountId   | number  | the account that the lineItem connect to                    |
| voucherId   | number  | the voucher that the lineItem connect to                    |
| createdAt   | number  | the timestamp of the lineItem created (timestamp in second) |
| updatedAt   | number  | the timestamp of the lineItem updated (timestamp in second) |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.4+78",
  "success": true,
  "code": "201ISF0000",
  "message": "Created successfully",
  "payload": {
    "id": 1,
    "journalId": 1,
    "no": "2024617001",
    "createdAt": 1718612861,
    "updatedAt": 1718612861,
    "lineItems": [
      {
        "id": 2,
        "amount": 110,
        "description": "'WSTP會計師工作輔助幡: 88,725, 文中網路版主機授權費用: 8,400, 文中工作站授權費用: 6,300'",
        "debit": true,
        "accountId": 61,
        "voucherId": 1,
        "createdAt": 1718612861,
        "updatedAt": 1718612861
      },
      {
        "id": 1,
        "amount": 2210,
        "description": "'光世代電路月租費： 593, HiNet企業專案服務費: 1607'",
        "debit": true,
        "accountId": 61,
        "voucherId": 1,
        "createdAt": 1718612861,
        "updatedAt": 1718612861
      },
      {
        "id": 3,
        "amount": 2310,
        "description": "'合庫銀行'",
        "debit": false,
        "accountId": 61,
        "voucherId": 1,
        "createdAt": 1718612861,
        "updatedAt": 1718612861
      }
    ]
  }
}
```

- 失敗的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "502",
  "message": "Bad gateway data from AICH is invalid type",
  "payload": {}
}
```

# voucherGetPreviewCreatingProcessStateByResultId

> (This api need to and will be migrate to microservice)

- Description: Get voucher preview creating process state by `[resultId]`

```json
{
  "message": "success",
  "status": "inProgress"
}
```

## Request

### Request url

```
GET /company/:companyId/voucher/:voucherId/process_statue
```

### Param

| name     | type   | description | require | default   |
| -------- | ------ | ----------- | ------- | --------- |
| resultId | string | resultId    | true    | undedined |

### Request Example

```
GET /company/1/voucher/1229001/process_statue
```

## Response

### Response Parameters

| name    | type                  | description                                                                                                |
| ------- | --------------------- | ---------------------------------------------------------------------------------------------------------- |
| powerby | string                | ISunFa api 1.0.0                                                                                           |
| success | boolean               | true \| false                                                                                              |
| code    | string                | response code                                                                                              |
| message | string                | description of response data                                                                               |
| payload | ProgressStatus (enum) | "success" \| "inProgress"\| "notFound" \| "alreadyUpload" \| "invalidInput" \| "llmError" \| "systemError" |

### Response Example

- 成功的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": true,
  "code": "200",
  "message": "Voucher preview creating process of id:${resultId} return successfully",
  "payload": "inProgress"
}
```

- 失敗的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": false,
  "code": "400",
  "message": "Reason why request has failed"
}
```

# voucherGetPreviewVoucherByResultId

> (This api need to and will be migrate to microservice)

- Description Get Preview Voucher by providing `[resultId]`, this preview data need to be checked by
  user then POST to `/voucher` and create real voucher

## Request

### Request url

```
GET /company/:companyId/voucher/:voucherId
```

### Param

| name     | type   | description | require | default   |
| -------- | ------ | ----------- | ------- | --------- |
| resultId | string | resultId    | true    | undefined |

### Request Example

```
GET /company/1/ocr/1229001/result
```

## Response

### Response Parameters

| name    | type     | description                  |
| ------- | -------- | ---------------------------- |
| powerby | string   | ISunFa api 1.0.0             |
| success | boolean  | true \| false                |
| code    | string   | response code                |
| message | string   | description of response data |
| payload | IVoucher | voucher review               |

### IVoucher

| name         | type               | description                                                              |
| ------------ | ------------------ | ------------------------------------------------------------------------ |
| invoiceIndex | string             | 可以到 invoice/:invoiceId/image取得圖片                                  |
| vouchIndex   | string             | index of vouch                                                           |
| metaDatas    | IVoucherMetaData[] |
| lineItem     | ILineItem\[\]      | Line items of voucher, each line item represent each line in irl voucher |

### IVoucherMetaData

| name        | type        | description                                      |
| ----------- | ----------- | ------------------------------------------------ |
| date        | number      | The date of the voucher.                         |
| voucherType | VoucherType | The type of the voucher                          |
| companyId   | string      | Identifier for the company.                      |
| companyName | string      | The name of the vendor or supplier.              |
| description | string      | A brief description of the voucher.              |
| reason      | string      | The reason for the payment.                      |
| projectId   | string      | Identifier for the related project.              |
| project     | string      | The name or description of the related project.  |
| contractId  | string      | Identifier for the related contract.             |
| contract    | string      | The name or description of the related contract. |
| payment     | Payment     | The payment details of the voucher.              |

### VoucherType(enum)

| name        | type         | description                      |
| ----------- | ------------ | -------------------------------- |
| VoucherType | string(enum) | 'receive', 'expense', 'transfer' |

### Payment

| name               | type                    | description                                                                                    |
| ------------------ | ----------------------- | ---------------------------------------------------------------------------------------------- |
| isRevenue          | boolean                 | Indicates if the transaction will generate income. True: money is coming in; false: going out. |
| price              | number                  | The total amount of money involved in the transaction.                                         |
| hasTax             | boolean                 | Specifies whether the amount includes tax.                                                     |
| taxPercentage      | number                  | The tax rate, for example, 0 or 5, etc.                                                        |
| hasFee             | boolean                 | Indicates whether there is a handling fee included.                                            |
| fee                | number                  | The amount of the handling fee.                                                                |
| paymentMethod      | string                  | The method by which money is received or paid out.                                             |
| paymentPeriod      | PaymentPeriodType       | The timing of payment, either at once (atOnce) or in installments (installment).               |
| installmentPeriod  | number                  | The number of installments for payment.                                                        |
| paymentAlreadyDone | number                  | The amount of money that has already been paid or collected.                                   |
| paymentStatus      | PaymentStatusType(enum) | The status of the payment. "paid" or "unpaid" or "partial"                                     |
| progress           | number                  | The actual work completion percentage for a contract, not referring to payment progress.       |

### PaymentPeriodType

| name              | type   | description             |
| ----------------- | ------ | ----------------------- |
| PaymentPeriodType | string | 'atOnce', 'installment' |

### PaymentStatusType

| name              | type   | description                 |
| ----------------- | ------ | --------------------------- |
| PaymentPeriodType | string | "paid", "unpaid", "partial" |

### ILineItem

| name          | type    | description                                                |
| ------------- | ------- | ---------------------------------------------------------- |
| lineItemIndex | string  | The unique index of the line item entry.                   |
| account       | string  | The account associated with the line item.                 |
| description   | string  | A detailed description of the line item.                   |
| debit         | boolean | Indicates if the item is a debit (true) or credit (false). |
| amount        | number  | The monetary amount of the line item.                      |

### Response Example

- 成功的回傳

```json
{
  "powerby": "ISunFa api 0.1.3+64",
  "success": true,
  "code": "200ISF0002",
  "message": "Get successfully",
  "payload": {
    "invoiceIndex": "0ab700d1b95466e1e0a7b3504.jpg",
    "voucherIndex": "202405-141",
    "metadatas": [
      {
        "date": 1713139200000,
        "voucherType": "expense",
        "companyId": "文中資訊股份有限公司",
        "companyName": "文中資訊股份有限公司",
        "description": "WSTP會計師工作輔助幫手:WSTP會計師工作輔助幫手: 88725, 文中網路版主機授權費用: 8400, 文中工作站授權費用: 6300",
        "reason": "購買軟體",
        "projectId": "aaa",
        "project": "ISunFa",
        "contractId": "bbb",
        "contract": "ISunFa",
        "payment": {
          "isRevenue": true,
          "price": 1500,
          "hasTax": false,
          "taxPercentage": 5,
          "hasFee": false,
          "fee": 0,
          "paymentMethod": "",
          "paymentPeriod": "atOnce",
          "installmentPeriod": 0,
          "paymentAlreadyDone": 0,
          "paymentStatus": "paid",
          "progress": 0
        }
      }
    ],
    "lineItems": [
      {
        "lineItemIndex": "20240426001",
        "account": "電信費",
        "description": "光世代電路月租費： 593, HiNet企業專案服務費: 1607",
        "debit": true,
        "amount": 2210
      },
      {
        "lineItemIndex": "20240325002",
        "account": "進項稅額",
        "description": "WSTP會計師工作輔助幫手: 88,725, 文中網路版主機授權費用: 8,400, 文中工作站授權費用: 6,300",
        "debit": true,
        "amount": 110
      },
      {
        "lineItemIndex": "20240426003",
        "account": "銀行存款",
        "description": "合庫銀行",
        "debit": false,
        "amount": 2310
      }
    ]
  }
}
```

- 失敗的回傳

```json
{
  "powerby": "ISunFa api 1.0.0",
  "success": true,
  "code": "400",
  "message": "Reason why api request failed"
}
```

# createFinancialReport

- description: Create a financial report based on the given date and financial statement name. Base
  on financial statement name, startDate and endDate, this API will find if the report has been
  generated or not, if the report has been generated it will return the ID of that report, if not it
  will create a new report and return the id of that report. This API will generate the report base
  on lastPeriodStartDate and lastPeriodEndDate (which base on startDate minus one year and endDate
  minus one year), and will return the ID of the last period report if it has been generated.

## Request

### Request URL

```
POST /company/:companyId/report_financial
```

### Query

| name                | type                                                                        | description                                                                                                                                                                   | require | default                   |
| ------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------- |
| projectId           | numeric \| undefined                                                        | which project this financial report will link to, it will be set as null if: 1. not provided, 2.provide null or undefined 3. provide other non numeric words                  | false   | undefined                 |
| reportType          | ReportSheetType                                                             | which financial statement you want to create, see description below, it will be BalanceSheet if not provided                                                                  | false   | BalanceSheet              |
| reportLanguage      | string                                                                      | this query is not implemented, it will only add language tag to report name                                                                                                   | false   | "tw"                      |
| startDate           | timestamp in second (millisecond will be transform into second if provided) | start date of the financial report period, it will be set to 0 if choosing BalanceSheet as reportType, this number minus 1 year will be the start date of last period         | false   | first second of this year |
| endDate             | timestamp in second (millisecond will be transform into second if provided) | end date of the financial report period, this number minus 1 year will be the start date of last period                                                                       | false   | last second of today      |
| financialOrAnalysis | string                                                                      | since report_financial and report_analysis might be combined, use "financial" (or not provided) to actually generate financial report, it will be "financial" if not provided | false   | "financial"               |

#### ReportSheetType

| name                       | type   | description                            |
| -------------------------- | ------ | -------------------------------------- |
| BalanceSheet               | string | it represent "balanceSheet"            |
| IncomeStatement            | string | it represent "incomeStatement"         |
| CashFlowStatement          | string | it represent "cashFlowStatement"       |
| CHANGE_IN_EQUITY_STATEMENT | string | it represent "changeInEquityStatement" |

## Response

| name | type   | description                             |
| ---- | ------ | --------------------------------------- |
| id   | number | the id of the report generated or found |

### Success Response

```json
{
  "powerby": "iSunFA v0.1.8+36",
  "success": true,
  "code": "201ISF0000",
  "message": "Created successfully",
  "payload": 10000001
}
```

### Error Response

```json
{
  "powerby": "iSunFA v0.1.8+36",
  "success": false,
  "code": "400ISF0001",
  "message": "Invalid request",
  "payload": {
    "thisPeriodReportId": -1,
    "lastPeriodReportId": -1
  }
}
```

# getFinancialReportById

- get single financial report after creating a new financial report, now have balance sheet, income
  statement, cash flow statement

## Request

### Request URL

```
GET /company/:companyId/report_financial/:reportId
```

### Param

| name     | type    | description                                                                                                                                                       | require | default   |
| -------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------- |
| reportId | numeric | report id of financial report, becareful that analysis report and financial report using same id from database, but this api can only be used on financial report | true    | undefined |

## Response

### Response Parameters

| name    | type        | description                  |
| ------- | ----------- | ---------------------------- |
| powerby | string      | ISunFa api 1.0.0             |
| success | boolean     | true or false                |
| code    | string      | response code                |
| message | string      | description of response data |
| payload | check below | response data                |

### payload

| name    | type                         | description                                                      |
| ------- | ---------------------------- | ---------------------------------------------------------------- |
| general | IAccountReadyForFrontend\[\] | an general version of financial report, contain less information |
| details | IAccountReadyForFrontend\[\] | an details version of financial report, contain all information  |

### IAccountReadyForFrontend

| name                  | type   | description                                             |
| --------------------- | ------ | ------------------------------------------------------- |
| code                  | string | code of account, it will be empty string if it is title |
| name                  | string | name of account                                         |
| curPeriodAmount       | number | current period amount                                   |
| curPeriodAmountString | string | current period amount string                            |
| curPeriodPercentage   | number | current period percentage                               |
| prePeriodAmount       | number | previous period amount                                  |
| prePeriodAmountString | string | previous period amount string                           |
| prePeriodPercentage   | number | previous period percentage                              |
| indent                | number | which level of indent can be use on name                |

```ts
export interface IAccountReadyForFrontend {
  code: string;
  name: string;
  curPeriodAmount: number;
  curPeriodAmountString: string;
  curPeriodPercentage: number;
  prePeriodAmount: number;
  prePeriodAmountString: string;
  prePeriodPercentage: number;
  indent: number;
}
```

#### ReportSheetType

| name                       | type   | description                            |
| -------------------------- | ------ | -------------------------------------- |
| BalanceSheet               | string | it represent "balanceSheet"            |
| IncomeStatement            | string | it represent "incomeStatement"         |
| CashFlowStatement          | string | it represent "cashFlowStatement"       |
| CHANGE_IN_EQUITY_STATEMENT | string | it represent "changeInEquityStatement" |

### Success Response

```json
{
    "powerby": "iSunFA v0.1.8+42",
    "success": true,
    "code": "200ISF0002",
    "message": "Get successfully",
    "payload": {
        "general": [
            {
                "code": "",
                "name": "營業活動之現金流量",
                "curPeriodAmount": 0,
                "curPeriodAmountString": "0",
                "curPeriodPercentage": 0,
                "prePeriodAmount": 0,
                "prePeriodAmountString": "0",
                "prePeriodPercentage": 0,
                "indent": 0
            },
            {
                "code": "A10000",
                "name": "本期稅前淨利（淨損）",
                "curPeriodAmount": 0,
                "curPeriodAmountString": "0",
                "curPeriodPercentage": 0,
                "prePeriodAmount": 0,
                "prePeriodAmountString": "0",
                "prePeriodPercentage": 0,
                "indent": 1
            },
        ...
        ],
        "details": [
            {
                "code": "A00030",
                "name": "本期稅前淨利（淨損）",
                "curPeriodAmount": 1400,
                "curPeriodPercentage": 0,
                "curPeriodAmountString": "1,400",
                "prePeriodAmount": 1400,
                "prePeriodPercentage": 0,
                "prePeriodAmountString": "1,400",
                "indent": 1
            },
            {
                "code": "A20100",
                "name": "收益費損項目合計",
                "curPeriodAmount": 0,
                "curPeriodPercentage": 0,
                "curPeriodAmountString": "0",
                "prePeriodAmount": 0,
                "prePeriodPercentage": 0,
                "prePeriodAmountString": "0",
                "indent": 2
            },
        ...
        ]
    }
}
```

### Error Response

```json
{
  "powerby": "iSunFA v0.1.8+42",
  "success": true,
  "code": "200ISF0002",
  "message": "Get successfully",
  "payload": {
    "general": [],
    "details": []
  }
}
```

# getAnalysisReport

- description: This API provides the functionality to get an analysis report (Financial Performance
  / Cost Analysis / HR Utilization / Forecast Report).

## Request

### Request url

```typescript
GET`/company/:companyId/report_analysis`;
```

### Query

| name       | type   | description                                                                                        | required | default |
| ---------- | ------ | -------------------------------------------------------------------------------------------------- | -------- | ------- |
| type       | string | type of analysis report - Financial Performance / Cost Analysis / HR Utilization / Forecast Report | yes      | -       |
| language   | string | applied language of the report                                                                     | yes      | -       |
| start_date | date   | the start date of the report                                                                       | yes      | -       |
| end_date   | date   | the end date of the report                                                                         | yes      | -       |

### Request Example

```typescript
GET`/company/1/report_analysis?type=Financial Performance&language=English&start_date=2024-02-01&end_date=2024-03-31`;
```

## Response

### Response Parameters

| name    | type    | description                        |
| ------- | ------- | ---------------------------------- |
| powerby | string  | iSunFA v0.1.2+50                   |
| success | boolean | true or false                      |
| code    | string  | response code                      |
| message | string  | description the status of the post |
| payload | string  | url link of the report             |

### Response Example

- 成功的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": true,
    "code": "200",
    "message": "request successful",
    "payload": "http://www.google.com.br"
  }
  ```
- 失敗的回傳

  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "400",
    "message": "bad request",
    "payload": null
  }
  ```

# getPublicAccounts

- description: This API provides the functionality to get all public accounting accounts.

## Request

### Request url

```typescript
GET`/account_public`;
```

### Query

| name    | type   | description                                     | required | default |
| ------- | ------ | ----------------------------------------------- | -------- | ------- |
| code    | number | the unique number of the accounting account     | no       | -       |
| account | string | the accounting account name                     | no       | -       |
| page    | number | which page of line items you want to get        | no       | 1       |
| limit   | number | how many line items you want to get in one page | no       | 10      |

### Request Example

- example 1

```typescript
GET`/account_public`;
```

- example 2

```typescript
GET`/account_public?code=1103&account="銀行存款"`;
```

## Response

### Response Parameters

| name    | type            | description                           |
| ------- | --------------- | ------------------------------------- |
| powerby | string          | iSunFA v0.1.2+50                      |
| success | boolean         | true or false                         |
| code    | string          | response code                         |
| message | string          | description the status of the request |
| payload | response data[] | array of response data                |

### Response Data

| name    | type   | description                        |
| ------- | ------ | ---------------------------------- |
| code    | number | the number code of the account     |
| account | string | the name of the accounting account |

### Response Example

- example 1

  - 成功的回傳
    ```json
    {
      "powerby": "iSunFA v0.1.2+50",
      "success": true,
      "code": "200",
      "message": "request successful",
      "payload": [
        {
          "code": 1103,
          "account": "銀行存款"
        },
        {
          "code": 1104,
          "account": "現金"
        },
        {
          "code": 1105,
          "account": "應收帳款"
        },
        {
          "code": 1106,
          "account": "預付款項"
        },
        {
          "code": 1107,
          "account": "存貨"
        }
      ]
    }
    ```
  - 失敗的回傳

    ```json
    {
      "powerby": "iSunFA v0.1.2+50",
      "success": false,
      "code": "400",
      "message": "bad request",
      "payload": null
    }
    ```

- example 2

  - 成功的回傳
    ```json
    {
      "powerby": "iSunFA v0.1.2+50",
      "success": true,
      "code": "200",
      "message": "request successful",
      "payload": [
        {
          "code": 1103,
          "account": "銀行存款"
        }
      ]
    }
    ```
  - 失敗的回傳

    ```json
    {
      "powerby": "iSunFA v0.1.2+50",
      "success": false,
      "code": "400",
      "message": "bad request",
      "payload": null
    }
    ```

# getAllAccounts

- description: This API provides the functionality to get all accounting accounts with pagination.

## Request

### Request url

```typescript
GET`/company/:companyId/account`;
```

### Query

When `undefined` is provided (or not provided that query), that query will be ignored, which means
all accounts will be provided

| name                  | type    | description                       | required | default   |
| --------------------- | ------- | --------------------------------- | -------- | --------- |
| companyId             | number  | specific id of the company        | yes      | -         |
| includeDefaultAccount | boolean | whether including default account | no       | undefined |
| liquidity             | boolean | whether containing liquidity      | no       | undefined |
| type                  | string  | which AccountType                 | no       | undefined |
| reportType            | string  | which ReportSheetType             | no       | undefined |
| equityType            | string  | which EquityType                  | no       | undefined |
| forUser               | boolean | whether used by user              | no       | undefined |
| page                  | number  | page number                       | no       | 1         |
| limit                 | number  | items per page                    | no       | 10        |
| sortBy                | string  | sort by 'code' or 'createdAt'     | no       | 'code'    |
| sortOrder             | string  | sort order 'asc' or 'desc'        | no       | 'asc'     |
| searchKey             | string  | search keywords                   | no       | undefined |

- AccountType
  - asset, liability, equity, revenue, cost, income, expense, gainOrLoss, otherComprehensiveIncome,
    cashFlow, changeInEquity, other
- ReportSheetType
  - balanceSheet, incomeStatement, cashFlowStatement, changeInEquityStatement
- EquityType
  - stock, capitalSurplus, retainedEarnings, otherEquity

### Request Example

```typescript
GET`/company/1/account?limit=2`;
```

## Response

### Response Parameters

| name    | type                      | description                  |
| ------- | ------------------------- | ---------------------------- |
| powerby | string                    | iSunFA v0.1.2+50             |
| success | boolean                   | true or false                |
| code    | string                    | response code                |
| message | string                    | description of response data |
| payload | IPaginatedAccount \| null | response data                |

### IPaginatedAccount

| name            | type                                     | description                      |
| --------------- | ---------------------------------------- | -------------------------------- |
| data            | IAccount[]                               | the data of the current page     |
| page            | number                                   | the current page number          |
| totalPages      | number                                   | the total number of pages        |
| totalCount      | number                                   | the total number of items        |
| pageSize        | number                                   | the number of items per page     |
| hasNextPage     | boolean                                  | whether there is a next page     |
| hasPreviousPage | boolean                                  | whether there is a previous page |
| sort            | { sortBy: string; sortOrder: string; }[] | the sorting criteria             |

### IAccount

| name      | type           | description                                         |
| --------- | -------------- | --------------------------------------------------- |
| id        | number         | the unique id of the updated account                |
| companyId | number         | the id of the company                               |
| system    | string         | the name of the system which the account belongs to |
| type      | string         | AccountType                                         |
| debit     | boolean        | whether it is a debit                               |
| liquidity | boolean        | whether its liquidity is current                    |
| code      | string         | the code number of the accounting account           |
| name      | string         | the name / note of the accounting account           |
| createdAt | number         | the creation timestamp                              |
| updatedAt | number         | the update timestamp                                |
| deletedAt | number or null | the deletion timestamp                              |

### AccountType

- 'asset'
- 'liability'
- 'equity'
- 'revenue'
- 'cost'
- 'income'
- 'expense'
- 'gainOrLoss'
- 'otherComprehensiveIncome'
- 'cashFlow'
- 'changeInEquity'
- 'other' |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.8+103",
  "success": true,
  "code": "200ISF0000",
  "message": "Success",
  "payload": {
    "data": [
      {
        "id": 10000540,
        "companyId": 1001,
        "system": "IFRS",
        "type": "asset",
        "liquidity": true,
        "debit": true,
        "code": "1101",
        "name": "庫存現金",
        "createdAt": 0,
        "updatedAt": 0,
        "deletedAt": null
      },
      {
        "id": 10000541,
        "companyId": 1001,
        "system": "IFRS",
        "type": "asset",
        "liquidity": true,
        "debit": true,
        "code": "1102",
        "name": "零用金／週轉金",
        "createdAt": 0,
        "updatedAt": 0,
        "deletedAt": null
      }
    ],
    "page": 1,
    "totalPages": 467,
    "totalCount": 934,
    "pageSize": 2,
    "hasNextPage": true,
    "hasPreviousPage": false,
    "sort": [
      {
        "sortBy": "code",
        "sortOrder": "asc"
      }
    ]
  }
}
```

- 失敗的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "400",
    "message": "bad request",
    "payload": null
  }
  ```

# getAccountsById

- description:
  - Get one accounts (會計科目) of certain companyId or that is regulated by government (which
    companyId is 1), and return the account data in the response, can not get the account that is
    customized by other company
  - `companyId` in the url has no use (can be any number or string), companyId will be retrieve from
    cookie instead

## Request

### Request url

```
POST /company/:companyId/account/:accountId
```

#### Cookies

| name | type   | description                                                                                   | require | default |
| ---- | ------ | --------------------------------------------------------------------------------------------- | ------- | ------- |
| sid  | string | if using postman for testing, sid need to be provide in cookie, so that api can get companyId | true    | -       |

#### params

| name      | type   | description           | require | default |
| --------- | ------ | --------------------- | ------- | ------- |
| accountId | string | the id of the account | true    | -       |

### Request Example

```
GET /company/1/account/1
```

## Response

### Response Parameters

| name    | type     | description                           |
| ------- | -------- | ------------------------------------- |
| powerby | string   | iSunFA v0.1.2+50                      |
| success | boolean  | true or false                         |
| code    | string   | response code                         |
| message | string   | description the status of the request |
| payload | IAccount | check below                           |

#### IAccount

| name      | type        | description                                                                                                             |
| --------- | ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| id        | number      | the id of the account                                                                                                   |
| companyId | number      | the company that the account belong to                                                                                  |
| system    | string      | the system that the account belong to                                                                                   |
| type      | AccountType | the type of account, "asset", "liability" , "equity", "income", "expense", "otherComprehensiveIncome"                   |
| liquidity | boolean     | the liquidity of account (current or not current)                                                                       |
| debit     | boolean     | the debit of account (debit or credit)                                                                                  |
| code      | string      | the code of account, can use this code to mapping in18 multi-language json file                                         |
| name      | string      | the name of account, this value is custom by user, it should be empty string if this account is regulated by government |
| createdAt | number      | the timestamp of the account created (timestamp in second)                                                              |
| updatedAt | number      | the timestamp of the account updated (timestamp in second)                                                              |

### Response example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.5+1",
  "success": true,
  "code": "200ISF0000",
  "message": "Success",
  "payload": {
    "id": 1,
    "companyId": 1,
    "system": "IFRS",
    "type": "Expense",
    "liquidity": true,
    "debit": true,
    "code": "0100005",
    "name": "營業成本",
    "createdAt": 1718681566,
    "updatedAt": 1718681566
  }
}
```

- 失敗的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "422ISF0000",
  "message": "Invalid input parameters",
  "payload": {}
}
```

# createNewSubAccountingAccount

- description: This API provides the functionality to create a new sub accounting account.

## Request

### Request url

```typescript
POST`/company/:companyId/account`;
```

### Body

| name      | type   | description                                        | required | default |
| --------- | ------ | -------------------------------------------------- | -------- | ------- |
| accountId | number | the unique number of the parent accounting account | yes      | -       |
| name      | string | the name / note of the accounting account          | yes      | -       |

### Request Example

```typescript
POST`/company/1/account`;

const body = {
  accountId: 251,
  name: '華奇銀行',
};
```

## Response

### Response Parameters

| name    | type    | description                       |
| ------- | ------- | --------------------------------- |
| powerby | string  | iSunFA v0.1.2+50                  |
| success | boolean | true or false                     |
| code    | string  | response code                     |
| message | string  | description the status of the put |
| payload | Account | response data                     |

### Account

| name      | type    | description                                         |
| --------- | ------- | --------------------------------------------------- |
| id        | number  | the unique id of the updated account                |
| companyId | number  | the id of the company                               |
| system    | string  | the name of the system which the account belongs to |
| type      | string  | AccountType                                         |
| debit     | boolean | whether it is a debit                               |
| liquidity | boolean | whether its liquidity is current                    |
| code      | string  | the code number of the accounting account           |
| name      | string  | the name / note of the accounting account           |
| createdAt | number  | the creation timestamp                              |
| updatedAt | number  | the update timestamp                                |
| deletedAt | number  | the deletion timestamp                              |

### AccountType

- 'asset'
- 'liability'
- 'equity'
- 'revenue'
- 'cost'
- 'income'
- 'expense'
- 'gainOrLoss'
- 'otherComprehensiveIncome'
- 'cashFlow'
- 'changeInEquity'
- 'other'

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.6+11",
  "success": true,
  "code": "201ISF0000",
  "message": "Created successfully",
  "payload": {
    "id": 1478,
    "companyId": 1,
    "system": "IFRS",
    "type": "asset",
    "debit": true,
    "liquidity": true,
    "code": "1100-1",
    "name": "華奇銀行",
    "forUser": true,
    "parentCode": "1100",
    "rootCode": "1100",
    "createdAt": 1719997790,
    "updatedAt": 1719997790,
    "level": 3,
    "deletedAt": null
  }
}
```

- 失敗的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "400",
    "message": "create failed",
    "payload": {}
  }
  ```

# updateOwnAccountInfoById

- description: This API provides the functionality to update the information(name) of owned account.

## Request

### Request url

```typescript
PUT`/company/:companyId/account/:accountId`;
```

### Param

| name      | type   | description                                | required | default |
| --------- | ------ | ------------------------------------------ | -------- | ------- |
| accountId | string | the unique id of the account to be updated | yes      | -       |

### Body

| name | type   | description                               | required | default |
| ---- | ------ | ----------------------------------------- | -------- | ------- |
| name | string | the name / note of the accounting account | yes      | -       |

### Request Example

```typescript
PUT`/company/99999991/account/1474`;

const body = {
  name: '華奇銀行2',
};
```

## Response

### Response Parameters

| name    | type    | description                       |
| ------- | ------- | --------------------------------- |
| powerby | string  | iSunFA v0.1.2+50                  |
| success | boolean | true or false                     |
| code    | string  | response code                     |
| message | string  | description the status of the put |
| payload | Account | response data                     |

### Account

| name      | type    | description                                         |
| --------- | ------- | --------------------------------------------------- |
| id        | number  | the unique id of the updated account                |
| companyId | number  | the id of the company                               |
| system    | string  | the name of the system which the account belongs to |
| type      | string  | AccountType                                         |
| debit     | boolean | whether it is a debit                               |
| liquidity | boolean | whether its liquidity is current                    |
| code      | string  | the code number of the accounting account           |
| name      | string  | the name / note of the accounting account           |
| createdAt | number  | the creation timestamp                              |
| updatedAt | number  | the update timestamp                                |
| deletedAt | number  | the deletion timestamp                              |

### AccountType

- 'asset'
- 'liability'
- 'equity'
- 'revenue'
- 'cost'
- 'income'
- 'expense'
- 'gainOrLoss'
- 'otherComprehensiveIncome'
- 'cashFlow'
- 'changeInEquity'
- 'other'

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.6+9",
  "success": true,
  "code": "200ISF0003",
  "message": "Update successfully",
  "payload": {
    "id": 1474,
    "companyId": 1001,
    "system": "IFRS",
    "type": "asset",
    "liquidity": true,
    "debit": true,
    "code": "1100-1",
    "name": "華奇銀行2",
    "createdAt": 0,
    "updatedAt": 0,
    "deletedAt": 0
  }
}
```

- 失敗的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "400",
    "message": "update failed",
    "payload": {}
  }
  ```

# deleteOwnAccountById

- description: This API provides the functionality to delete an owned account by update deleted
  time.

## Request

### Request url

```typescript
DELETE`/company/:companyId/account/:accountId`;
```

### Param

| name      | type   | description                                | required | default |
| --------- | ------ | ------------------------------------------ | -------- | ------- |
| accountId | string | the unique id of the account to be deleted | yes      | -       |

### Request Example

```typescript
DELETE`/company/99999991/account/1474`;
```

## Response

### Response Parameters

| name    | type    | description                       |
| ------- | ------- | --------------------------------- |
| powerby | string  | iSunFA v0.1.2+50                  |
| success | boolean | true or false                     |
| code    | string  | response code                     |
| message | string  | description the status of the put |
| payload | Account | response data                     |

### Account

| name      | type    | description                                         |
| --------- | ------- | --------------------------------------------------- |
| id        | number  | the unique id of the updated account                |
| companyId | number  | the id of the company                               |
| system    | string  | the name of the system which the account belongs to |
| type      | string  | AccountType                                         |
| debit     | boolean | whether it is a debit                               |
| liquidity | boolean | whether its liquidity is current                    |
| code      | string  | the code number of the accounting account           |
| name      | string  | the name / note of the accounting account           |
| createdAt | number  | the creation timestamp                              |
| updatedAt | number  | the update timestamp                                |
| deletedAt | number  | the deletion timestamp                              |

### AccountType

- 'asset'
- 'liability'
- 'equity'
- 'revenue'
- 'cost'
- 'income'
- 'expense'
- 'gainOrLoss'
- 'otherComprehensiveIncome'
- 'cashFlow'
- 'changeInEquity'
- 'other'

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.6+9",
  "success": true,
  "code": "200ISF0004",
  "message": "Delete successfully",
  "payload": {
    "id": 1474,
    "companyId": 1001,
    "system": "IFRS",
    "type": "asset",
    "liquidity": true,
    "debit": true,
    "code": "1100-1",
    "name": "華奇銀行2",
    "createdAt": 0,
    "updatedAt": 0,
    "deletedAt": 1719913324
  }
}
```

- 失敗的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "400",
    "message": "delete failed",
    "payload": {}
  }
  ```

# getAllEmployees

- description: This API provides the functionality to get all employees information.

## Request

### Request url

```typescript
GET`/company/:companyId/employee`;
```

### Query

| name        | type   | description                                        | required | default |
| ----------- | ------ | -------------------------------------------------- | -------- | ------- |
| companyId   | string | specific id of the company                         | yes      | -       |
| targetPage  | string | the page number to be retrieved                    | false    | 1       |
| pageSize    | string | the number of items per page                       | false    | 10      |
| searchQuery | string | the query string used to search for specific items | false    | ""      |

### Request Example

```typescript
GET`/company/10000000/employee?targetPage=2&pageSize=2`;
```

## Response

### Response Parameters

| name    | type                                | description                  |
| ------- | ----------------------------------- | ---------------------------- |
| powerby | string                              | iSunFA v0.1.2+50             |
| success | boolean                             | true or false                |
| code    | string                              | response code                |
| message | string                              | description of response data |
| payload | IEasyEmployeeWithPagination \| null | response data                |

### IEasyEmployeeWithPagination

| name            | type            | description                           |
| --------------- | --------------- | ------------------------------------- |
| data            | IEasyEmployee[] | an array of employee data             |
| page            | number          | the current page number               |
| totalPages      | number          | the total number of pages             |
| totalCount      | number          | the total number of records           |
| pageSize        | number          | the number of records per page        |
| hasNextPage     | boolean         | indicates if there is a next page     |
| hasPreviousPage | boolean         | indicates if there is a previous page |

### IEasyEmployee

| name         | type   | description                            |
| ------------ | ------ | -------------------------------------- |
| id           | number | the unique identifier for the employee |
| name         | string | the name of the employee               |
| salary       | number | the salary of the employee             |
| department   | string | the department the employee belongs to |
| payFrequency | string | the frequency of salary payment        |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.8+52",
  "success": true,
  "code": "200ISF0001",
  "message": "List successfully",
  "payload": {
    "data": [
      {
        "id": 10000002,
        "name": "cook",
        "department": "Engineering",
        "payFrequency": "monthly",
        "salary": 4000
      },
      {
        "id": 10000004,
        "name": "bee",
        "department": "Marketing",
        "payFrequency": "Monthly",
        "salary": 45000
      }
    ],
    "page": 2,
    "totalPages": 2,
    "totalCount": 4,
    "pageSize": 2,
    "hasNextPage": false,
    "hasPreviousPage": true
  }
}
```

- 失敗的回傳

  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "400",
    "message": "bad request",
    "payload": null
  }
  ```

# getAnEmployee

- description: This API provides the functionality to query specific employee information.

## Request

### Request url

```typescript
GET`/company/:companyId/employee/:employeeId`;
```

### Query

| name       | type   | description                | required | default |
| ---------- | ------ | -------------------------- | -------- | ------- |
| companyId  | string | specific id of the company | yes      | -       |
| employeeId | string | specific employee number   | yes      | -       |

### Request Example

```typescript
GET`/company/1/employee/3`;
```

## Response

### Response Parameters

| name    | type                | description                  |
| ------- | ------------------- | ---------------------------- |
| powerby | string              | iSunFA v0.1.2+50             |
| success | boolean             | true or false                |
| code    | string              | response code                |
| message | string              | description of response data |
| payload | IEmployeeData \| {} | response data                |

### IEmployeeData

| name                | type                           | description                                                    |
| ------------------- | ------------------------------ | -------------------------------------------------------------- |
| id                  | number                         | the unique identifier of the employee                          |
| name                | string                         | the name of the employee                                       |
| salary              | number                         | the salary of the employee                                     |
| department          | string                         | the department the employee belongs to                         |
| start_date          | number                         | the start date of the employee's employment (timestamp)        |
| bonus               | number                         | the bonus for the employee                                     |
| salary_payment_mode | string                         | the mode of salary payment                                     |
| pay_frequency       | string                         | the frequency of salary payment                                |
| projects            | { id: number, name: string }[] | the projects the employee is involved in                       |
| insurance_payments  | number                         | the employee insurance paid by the employer                    |
| additionalOfTotal   | number                         | the additional amount of salary, bonus, and insurance_payments |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.8+52",
  "success": true,
  "code": "200ISF0002",
  "message": "Get successfully",
  "payload": {
    "id": 10000000,
    "name": "aook",
    "salary": 200000,
    "department": "Engineering",
    "start_date": 1630435200,
    "bonus": 1000,
    "salary_payment_mode": "Cash",
    "pay_frequency": "Monthly",
    "projects": [
      {
        "id": 9999991,
        "name": "iSunFA"
      }
    ],
    "insurance_payments": 1000,
    "additionalOfTotal": 202000
  }
}
```

- 失敗的回傳

  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "400",
    "message": "bad request",
    "payload": {}
  }
  ```

# getAllDepartments

- description: This API provides the functionality to get all departments information.

## Request

### Request url

```typescript
GET`/company/:companyId/department`;
```

### Request Example

```typescript
GET`/company/1/department`;
```

## Response

### Response Parameters

| name    | type             | description                  |
| ------- | ---------------- | ---------------------------- |
| powerby | string           | iSunFA v0.1.2+50             |
| success | boolean          | true or false                |
| code    | string           | response code                |
| message | string           | description of response data |
| payload | string[] \| null | array of departments         |

### Response Example

- 成功的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": true,
    "code": "200",
    "message": "request successful",
    "payload": ["Marketing", "Accounting", "Human Resource", "UI/UX", "PM", "Develop"]
  }
  ```
- 失敗的回傳

  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "400",
    "message": "bad request",
    "payload": null
  }
  ```

# createAnEmployee

- description: This API provides the functionality to create a new employee information.

## Request

### Request url

```typescript
POST`/company/:companyId/employee`;
```

### Query

| name      | type   | description                | required | default |
| --------- | ------ | -------------------------- | -------- | ------- |
| companyId | string | specific id of the company | yes      | -       |

### Body

| name          | type   | description                            |
| ------------- | ------ | -------------------------------------- |
| name          | string | the employee's name                    |
| salary        | number | the employee's base salary             |
| department    | string | the department the employee belongs to |
| bonus         | number | the employee's bonus                   |
| salaryPayMode | string | method of salary payment               |
| payFrequency  | string | frequency of salary payment            |

### Request Example

```typescript
POST`/company/1/employee`;
```

- Body

```json
{
  "name": "bee",
  "department": "Marketing",
  "salaryPayMode": "Cash",
  "payFrequency": "Monthly",
  "salary": 45000,
  "bonus": 0
}
```

## Response

### Response Parameters

| name    | type              | description                        |
| ------- | ----------------- | ---------------------------------- |
| powerby | string            | iSunFA v0.1.2+50                   |
| success | boolean           | true or false                      |
| code    | string            | response code                      |
| message | string            | description the status of the post |
| payload | IEmployee \| null | response data                      |

### IEmployee

| name             | type                | description                                                   |
| ---------------- | ------------------- | ------------------------------------------------------------- |
| id               | number              | the unique identifier for the employee                        |
| name             | string              | the name of the employee                                      |
| imageId          | string \| undefined | the id of the employee's image, if any                        |
| departmentId     | number              | the id of the department the employee belongs to              |
| companyId        | number              | the id of the company the employee works for                  |
| salary           | number              | the salary of the employee                                    |
| insurancePayment | number              | the employee insurance paid by the employer                   |
| bonus            | number              | the bonus for the employee                                    |
| salaryPayMode    | string              | the mode of salary payment                                    |
| payFrequency     | string              | the frequency of salary payment                               |
| startDate        | number              | the start date of the employee's employment (timestamp)       |
| endDate          | number \| undefined | the end date of the employee's employment, if any (timestamp) |
| createdAt        | number              | the timestamp when the employee record was created            |
| updatedAt        | number              | the timestamp when the employee record was last updated       |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.8+52",
  "success": true,
  "code": "201ISF0000",
  "message": "Created successfully",
  "payload": {
    "id": 10000005,
    "name": "bee",
    "departmentId": 10000000,
    "companyId": 10000000,
    "salary": 45000,
    "insurancePayment": 8823,
    "bonus": 0,
    "salaryPayMode": "Cash",
    "payFrequency": "Monthly",
    "startDate": 1721704554,
    "createdAt": 1721704554,
    "updatedAt": 1721704554
  }
}
```

- 失敗的回傳

  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "400",
    "message": "create employee failed",
    "payload": null
  }
  ```

# DeleteAnEmployee

- description: This API provides the functionality to mark an resigned employee by updating end
  date.

## Request

### Request url

```typescript
DELETE`/company/:companyId/employee/:employeeId`;
```

### Query

| name       | type   | description                | required | default |
| ---------- | ------ | -------------------------- | -------- | ------- |
| companyId  | string | specific id of the company | yes      | -       |
| employeeId | string | specific employee number   | yes      | -       |

### Request Example

```typescript
DELETE`/company/1/employee/3`;
```

## Response

### Response Parameters

| name    | type    | description                          |
| ------- | ------- | ------------------------------------ |
| powerby | string  | iSunFA v0.1.2+50                     |
| success | boolean | true or false                        |
| code    | string  | response code                        |
| message | string  | description the status of the delete |
| payload | {}      | -                                    |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.8+52",
  "success": true,
  "code": "200ISF0004",
  "message": "Delete successfully",
  "payload": {}
}
```

- 失敗的回傳

  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "400",
    "message": "delete employee failed",
    "payload": {}
  }
  ```

# UpdateAnEmployee

- description: This API provides the functionality to update specific employee information.

## Request

### Request url

```typescript
PUT`/company/:companyId/employee/:employeeId`;
```

### Query

| name       | type   | description                | required | default |
| ---------- | ------ | -------------------------- | -------- | ------- |
| companyId  | string | specific id of the company | yes      | -       |
| employeeId | string | specific employee number   | yes      | -       |

### Body

| name             | type                           | description                                 |
| ---------------- | ------------------------------ | ------------------------------------------- |
| insurancePayment | number                         | the employee insurance paid by the employer |
| salary           | number                         | the employee's base salary                  |
| projectIdsNames  | { id: number, name: string }[] | the projects the employee is involved in    |
| bonus            | number                         | the employee's bonus                        |
| salaryPayMode    | string                         | method of salary payment                    |
| payFrequency     | string                         | frequency of salary payment                 |

### Request Example

```typescript
PUT`/company/1/employee/3`;
```

- Body

```json
{
  "insurancePayment": 1000,
  "salaryPayMode": "Cash",
  "payFrequency": "Monthly",
  "salary": 200000,
  "bonus": 1000,
  "projectIdsNames": [
    {
      "id": 9999991,
      "name": "iSunFA"
    },
    {
      "id": 9999992,
      "name": "BAIFA"
    }
  ]
}
```

## Response

### Response Parameters

| name    | type                | description                   |
| ------- | ------------------- | ----------------------------- |
| powerby | string              | iSunFA v0.1.2+50              |
| success | boolean             | true or false                 |
| code    | string              | response code                 |
| message | string              | description the update status |
| payload | IEmployeeData \| {} | response data                 |

### IEmployeeData

| name                | type                           | description                                                    |
| ------------------- | ------------------------------ | -------------------------------------------------------------- |
| id                  | number                         | the unique identifier of the employee                          |
| name                | string                         | the name of the employee                                       |
| salary              | number                         | the salary of the employee                                     |
| department          | string                         | the department the employee belongs to                         |
| start_date          | number                         | the start date of the employee's employment (timestamp)        |
| bonus               | number                         | the bonus for the employee                                     |
| salary_payment_mode | string                         | the mode of salary payment                                     |
| pay_frequency       | string                         | the frequency of salary payment                                |
| projects            | { id: number, name: string }[] | the projects the employee is involved in                       |
| insurance_payments  | number                         | the employee insurance paid by the employer                    |
| additionalOfTotal   | number                         | the additional amount of salary, bonus, and insurance_payments |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.8+52",
  "success": true,
  "code": "200ISF0003",
  "message": "Update successfully",
  "payload": {
    "id": 10000000,
    "name": "aook",
    "salary": 200000,
    "department": "Engineering",
    "start_date": 1630435200,
    "bonus": 1000,
    "salary_payment_mode": "Cash",
    "pay_frequency": "Monthly",
    "projects": [
      {
        "id": 9999991,
        "name": "iSunFA"
      },
      {
        "id": 9999992,
        "name": "BAIFA"
      }
    ],
    "insurance_payments": 1000,
    "additionalOfTotal": 202000
  }
}
```

- 失敗的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "400",
    "message": "update employee information failed",
    "payload": {}
  }
  ```

# getEmployeesNamesByDepartments

- description: This API provides the functionality to get all employees' names and ids by
  departments.

## Request

### Request url

```typescript
GET`/company/:companyId/salary`;
```

### Request Example

```typescript
GET`/company/1/salary`;
```

## Response

### Response Parameters

| name    | type           | description                  |
| ------- | -------------- | ---------------------------- |
| powerby | string         | iSunFA v0.1.2+50             |
| success | boolean        | true or false                |
| code    | string         | response code                |
| message | string         | description of response data |
| payload | Salary[] \| {} | array of response data       |

### Salary

| name       | type                           | description                             |
| ---------- | ------------------------------ | --------------------------------------- |
| department | string                         | the department the employees belongs to |
| names_ids  | { name: string; id: number }[] | the employees' names and ids            |

### Response Example

- 成功的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": true,
    "code": "200",
    "message": "request successful",
    "payload": [
      {
        "department": "Tech Dev",
        "names_ids": [
          { "name": "John Doe", "id": 1 },
          { "name": "Andy", "id": 2 },
          { "name": "Eva", "id": 3 }
        ]
      },
      {
        "department": "Product Design",
        "names_ids": [
          { "name": "Jane Smith", "id": 4 },
          { "name": "Paul", "id": 5 }
        ]
      },
      {
        "department": "Marketing",
        "names_ids": [
          { "name": "Bob Brown", "id": 6 },
          { "name": "Johnny", "id": 7 },
          { "name": "Queen", "id": 8 },
          { "name": "Lion", "id": 9 }
        ]
      }
    ]
  }
  ```
- 失敗的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "400",
    "message": "bad request",
    "payload": {}
  }
  ```

# CreateAnSalaryBookkeeping

- description: This API provides the functionality to create an employee salary bookkeeping.

## Request

### Request url

```typescript
POST`/company/:companyId/salary/:employeeId`;
```

### Query

| name       | type   | description              | required | default |
| ---------- | ------ | ------------------------ | -------- | ------- |
| employeeId | number | specific employee number | yes      | -       |

### Body

| name        | type   | description                     |
| ----------- | ------ | ------------------------------- |
| start_date  | date   | start date of the salary period |
| end_Date    | date   | end date of the salary period   |
| description | string | salary description              |

### Request Example

```typescript
POST`/company/1/salary/3`;

const body = {
  start_date: '2023-03-01',
  end_date: '2023-03-31',
  description: 'March salary',
};
```

## Response

### Response Parameters

| name    | type    | description                                         |
| ------- | ------- | --------------------------------------------------- |
| powerby | string  | iSunFA v0.1.2+50                                    |
| success | boolean | true or false                                       |
| code    | string  | response code                                       |
| message | string  | description the status of create salary bookkeeping |

### Response Example

- 成功的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": true,
    "code": "200",
    "message": "create salary bookkeeping successful"
  }
  ```
- 失敗的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "400",
    "message": "create salary bookkeeping failed"
  }
  ```

# getAllUsers

- description: This API provides the functionality to get all users.

## Request

### Request url

```typescript
GET`/user`;
```

### Request Example

```typescript
GET`/user`;
```

## Response

### Response Parameters

| name    | type                    | description                  |
| ------- | ----------------------- | ---------------------------- |
| powerby | string                  | iSunFA v0.1.2+50             |
| success | boolean                 | true or false                |
| code    | string                  | response code                |
| message | string                  | description of response data |
| payload | response data[] \| null | array of response data       |

### Response data

| name         | type   | description                         |
| ------------ | ------ | ----------------------------------- |
| id           | string | the unique identifier for the user  |
| name         | string | the user's name                     |
| fullName     | string | the user's full name (optional)     |
| email        | string | the user's email address (optional) |
| phone        | string | the user's phone number (optional)  |
| credentialId | string | the credential ID                   |
| publicKey    | string | the public key                      |
| algorithm    | string | the encryption algorithm used       |

### Response Example

- 成功的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": true,
    "code": "200",
    "message": "List Users successfully",
    "payload": [
      {
        "id": "1",
        "name": "John",
        "fullName": "John Doe",
        "email": "john@mermer.cc",
        "phone": "12345678",
        "kycStatus": "verified",
        "credentialId": "1",
        "publicKey": "public-key",
        "algorithm": "ES256"
      },
      {
        "id": "2",
        "name": "Jane",
        "credentialId": "2",
        "publicKey": "public-key",
        "algorithm": "ES256"
      }
    ]
  }
  ```

# signIn

- description: This API provides user authentication functionality through WebAuthn.

## Request

### Request URL

```typescript
POST`/sign-in`;
```

### Body Parameters

| name                 | type   | description                                      | required | default |
| -------------------- | ------ | ------------------------------------------------ | -------- | ------- |
| authentication       | object | object containing the authentication information | yes      | -       |
| registeredCredential | string | the credential already registered on the server  | yes      | -       |
| challenge            | string | challenge used for authentication                | yes      | -       |

### Request Example

```typescript
POST`/sign-in`;

const body = {
  authentication: {
    // authentication data
    credentialId: '3924HhJdJMy_svnUowT8eoXrOOO6NLP8SK85q2RPxdU',
    authenticatorData: 'SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2MFAAAAAQ==',
    clientData:
      'eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoiNTY1MzViMTMtNWQ5My00MTk0LWEyODItZjIzNGMxYzI0NTAwIiwib3JpZ2luIjoiaHR0cDovL2xvY2FsaG9zdDo4MDgwIiwiY3Jvc3NPcmlnaW4iOmZhbHNlLCJvdGhlcl9rZXlzX2Nhbl9iZV9hZGRlZF9oZXJlIjoiZG8gbm90IGNvbXBhcmUgY2xpZW50RGF0YUpTT04gYWdhaW5zdCBhIHRlbXBsYXRlLiBTZWUgaHR0cHM6Ly9nb28uZ2wveWFiUGV4In0=',
    signature:
      'MEUCIAqtFVRrn7q9HvJCAsOhE3oKJ-Hb4ISfjABu4lH70MKSAiEA666slmop_oCbmNZdc-QemTv2Rq4g_D7UvIhWT_vVp8M=',
  },
  registeredCredential:
    // registered credential
    '3924HhJdJMy_svnUowT8eoXrOOO6NLP8SK85q2RPxdU',
  challenge:
    // randomly generated challenge code
    'a7c61ef9-dc23-4806-b486-2428938a547e',
};
```

## Response

### Response Parameters

| name    | type    | description                  |
| ------- | ------- | ---------------------------- | --- | ------------------- |
| powerby | string  | iSunFA v0.1.2+50             |
| success | boolean | true or false                |
| code    | string  | response code                |
| message | string  | description of response data |
| payload | user    |                              | {}  | response data or {} |

### user

| name         | type   | description                         |
| ------------ | ------ | ----------------------------------- |
| id           | string | the unique identifier for the user  |
| name         | string | the user's name                     |
| fullName     | string | the user's full name (optional)     |
| email        | string | the user's email address (optional) |
| phone        | string | the user's phone number (optional)  |
| credentialId | string | the credential ID                   |
| publicKey    | string | the public key                      |
| algorithm    | string | the encryption algorithm used       |
| imageId      | string | avatar of the user                  |

### Response Example

- 成功的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": true,
    "code": "200",
    "message": "Get User sucessfully",
    "payload": {
      "id": "1",
      "name": "John",
      "fullName": "John Doe",
      "email": "john@mermer.cc",
      "phone": "12345678",
      "credentialId": "1",
      "publicKey": "public-key",
      "algorithm": "ES256"
    }
  }
  ```
- Unsuccessful Response
  ```json
  {
    "payload": "error"
  }
  ```

# signUp

- description: This API is used to register an user through WebAuthn.

## Request

### Request URL

```typescript
POST`/sign-up`;
```

### Body Parameters

| name         | type   | description                                | required | default |
| ------------ | ------ | ------------------------------------------ | -------- | ------- |
| registration | object | object containing the registration details | yes      | -       |

### Request Example

```typescript
POST`/sign-up`;

const body = {
  username: 'Arnaud',
  credential: {
    id: '3924HhJdJMy_svnUowT8eoXrOOO6NLP8SK85q2RPxdU',
    publicKey:
      'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEgyYqQmUAmDn9J7dR5xl-HlyAA0R2XV5sgQRnSGXbLt_xCrEdD1IVvvkyTmRD16y9p3C2O4PTZ0OF_ZYD2JgTVA==',
    algorithm: 'ES256',
  },
  authenticatorData:
    'SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2NFAAAAAAiYcFjK3EuBtuEw3lDcvpYAIN_duB4SXSTMv7L51KME_HqF6zjjujSz_EivOatkT8XVpQECAyYgASFYIIMmKkJlAJg5_Se3UecZfh5cgANEdl1ebIEEZ0hl2y7fIlgg8QqxHQ9SFb75Mk5kQ9esvadwtjuD02dDhf2WA9iYE1Q=',
  clientData:
    'eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIiwiY2hhbGxlbmdlIjoiYTdjNjFlZjktZGMyMy00ODA2LWI0ODYtMjQyODkzOGE1NDdlIiwib3JpZ2luIjoiaHR0cDovL2xvY2FsaG9zdDo4MDgwIiwiY3Jvc3NPcmlnaW4iOmZhbHNlfQ==',
};
```

## Response

### Response Parameters

| name    | type    | description                  |
| ------- | ------- | ---------------------------- | --- | ------------------- |
| powerby | string  | iSunFA v0.1.2+50             |
| success | boolean | true or false                |
| code    | string  | response code                |
| message | string  | description of response data |
| payload | user    |                              | {}  | response data or {} |

### user

| name         | type   | description                         |
| ------------ | ------ | ----------------------------------- |
| id           | string | the unique identifier for the user  |
| name         | string | the user's name                     |
| fullName     | string | the user's full name (optional)     |
| email        | string | the user's email address (optional) |
| phone        | string | the user's phone number (optional)  |
| credentialId | string | the credential ID                   |
| publicKey    | string | the public key                      |
| algorithm    | string | the encryption algorithm used       |
| imageId      | string | avatar of the user                  |

### Response Example

- 成功的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": true,
    "code": "200",
    "message": "Get User sucessfully",
    "payload": {
      "id": "1",
      "name": "John",
      "fullName": "John Doe",
      "email": "john@mermer.cc",
      "phone": "12345678",
      "credentialId": "1",
      "publicKey": "public-key",
      "algorithm": "ES256"
    }
  }
  ```
- Unsuccessful Response
  ```json
  {
    "payload": null
  }
  ```

# signOut

- description: This API is used to sign out an user by clearing the FIDO2 cookie.

## Request

### Request URL

```typescript
POST`/sign-out`;
```

### Request Example

```typescript
POST`/sign-out`;
```

## Response

### Response Parameters

| name    | type    | description                                                            |
| ------- | ------- | ---------------------------------------------------------------------- |
| success | boolean | indicates whether the operation was successful                         |
| message | string  | provides a message related to the success or failure of the operation. |

### Response Example

- Successful Response
  ```json
  {
    "success": true,
    "message": "Successfully signed out"
  }
  ```
- Unsuccessful Response
  ```json
  {
    "success": false,
    "message": "Failed to sign out"
  }
  ```

# getSession

- description: This API provides the functionality to get the session information.

## Request

### Request URL

```typescript
GET`/session`;
```

### Request Example

```typescript
GET`/session`;
```

## Response

### Response Parameters

| name    | type           | description                  |
| ------- | -------------- | ---------------------------- |
| powerby | string         | iSunFA v0.1.2+50             |
| success | boolean        | true or false                |
| code    | string         | response code                |
| message | string         | description of response data |
| payload | company & user | response data or {}          |

#### Company

| name      | type    | description                     |
| --------- | ------- | ------------------------------- |
| id        | number  | id of company                   |
| name      | string  | name of company                 |
| code      | string  | code of company                 |
| regional  | string  | regional of company             |
| kycStatus | boolean | kyc status of company           |
| imageId   | string  | image id of company             |
| startDate | number  | start date of the company       |
| createdAt | number  | create timestamp of the company |
| updatedAt | number  | update timestamp of the company |

#### user

| name         | type   | description                         |
| ------------ | ------ | ----------------------------------- |
| id           | string | the unique identifier for the user  |
| name         | string | the user's name                     |
| fullName     | string | the user's full name (optional)     |
| email        | string | the user's email address (optional) |
| phone        | string | the user's phone number (optional)  |
| credentialId | string | the credential ID                   |
| publicKey    | string | the public key                      |
| algorithm    | string | the encryption algorithm used       |
| imageId      | string | avatar of the user                  |

# selectCompany

- description: This API provides the functionality to select a company.

## Request

### Request URL

```typescript
PUT`/company/:companyId/select`;
```

### Query

| name      | type   | description             | required | default |
| --------- | ------ | ----------------------- | -------- | ------- |
| companyId | string | specific company number | yes      | -       |

### Request Example

```typescript
PUT`/company/1/select`;
```

## Response

### Response Parameters

| name    | type    | description                  |
| ------- | ------- | ---------------------------- |
| powerby | string  | iSunFA v0.1.2+50             |
| success | boolean | true or false                |
| code    | string  | response code                |
| message | string  | description of response data |
| payload | company | response data or {}          |

#### Company

| name      | type    | description                     |
| --------- | ------- | ------------------------------- |
| id        | number  | id of company                   |
| name      | string  | name of company                 |
| code      | string  | code of company                 |
| regional  | string  | regional of company             |
| kycStatus | boolean | kyc status of company           |
| imageId   | string  | image id of company             |
| startDate | number  | start date of the company       |
| createdAt | number  | create timestamp of the company |
| updatedAt | number  | update timestamp of the company |

### Response Example

- 成功的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": true,
    "code": "200",
    "message": "Select Company sucessfully",
    "payload": {
      "id": "1",
      "name": "iSunFA",
      "code": "168",
      "regional": "Taiwan",
      "kycStatus": false,
      "imageId": "123",
      "startDate": 1630000000,
      "createdAt": 1630000000,
      "updatedAt": 1630000000
    }
  }
  ```
- 失敗的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "404",
    "message": "Resource not found",
    "payload": {}
  }
  ```

# getAnUser

- description: This API provides the functionality to get an user.

## Request

### Request url

```typescript
GET`/user/:userId`;
```

### Query

| name   | type   | description          | required | default |
| ------ | ------ | -------------------- | -------- | ------- |
| userId | string | specific user number | yes      | -       |

### Request Example

```typescript
GET`/user/1`;
```

## Response

### Response Parameters

| name    | type    | description                  |
| ------- | ------- | ---------------------------- | --- | ------------------- |
| powerby | string  | iSunFA v0.1.2+50             |
| success | boolean | true or false                |
| code    | string  | response code                |
| message | string  | description of response data |
| payload | user    |                              | {}  | response data or {} |

### user

| name         | type   | description                         |
| ------------ | ------ | ----------------------------------- |
| id           | string | the unique identifier for the user  |
| name         | string | the user's name                     |
| fullName     | string | the user's full name (optional)     |
| email        | string | the user's email address (optional) |
| phone        | string | the user's phone number (optional)  |
| credentialId | string | the credential ID                   |
| publicKey    | string | the public key                      |
| algorithm    | string | the encryption algorithm used       |
| imageId      | string | avatar of the user                  |

### Response Example

- 成功的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": true,
    "code": "200",
    "message": "Get User sucessfully",
    "payload": {
      "id": "1",
      "name": "John",
      "fullName": "John Doe",
      "email": "john@mermer.cc",
      "phone": "12345678",
      "credentialId": "1",
      "publicKey": "public-key",
      "algorithm": "ES256"
    }
  }
  ```
- 失敗的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "404",
    "message": "Resource not found",
    "payload": {}
  }
  ```

# deleteAnUser

- description: This API provides the functionality to delete an user.

## Request

### Request url

```typescript
DELETE`/user/:userId`;
```

### Query

| name   | type   | description          | required | default |
| ------ | ------ | -------------------- | -------- | ------- |
| userId | string | specific user number | yes      | -       |

### Request Example

```typescript
DELETE`/user/1`;
```

## Response

### Response Parameters

| name    | type    | description                  |
| ------- | ------- | ---------------------------- | --- | ------------------- |
| powerby | string  | iSunFA v0.1.2+50             |
| success | boolean | true or false                |
| code    | string  | response code                |
| message | string  | description of response data |
| payload | user    |                              | {}  | response data or {} |

### user

| name         | type   | description                         |
| ------------ | ------ | ----------------------------------- |
| id           | string | the unique identifier for the user  |
| name         | string | the user's name                     |
| fullName     | string | the user's full name (optional)     |
| email        | string | the user's email address (optional) |
| phone        | string | the user's phone number (optional)  |
| credentialId | string | the credential ID                   |
| publicKey    | string | the public key                      |
| algorithm    | string | the encryption algorithm used       |
| imageId      | string | avatar of the user                  |

### Response Example

- 成功的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": true,
    "code": "200",
    "message": "Delete User sucessfully",
    "payload": {
      "id": "1",
      "name": "John",
      "fullName": "John Doe",
      "email": "john@mermer.cc",
      "phone": "12345678",
      "credentialId": "1",
      "publicKey": "public-key",
      "algorithm": "ES256"
    }
  }
  ```
- 失敗的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "404",
    "message": "Resource not found",
    "payload": {}
  }
  ```

# updateAnUser

- description: This API provides the functionality to update an user.

## Request

### Request url

```typescript
PUT`/user/:userId`;
```

### Query

| name   | type   | description          | required | default |
| ------ | ------ | -------------------- | -------- | ------- |
| userId | string | specific user number | yes      | -       |

### Body

| name     | type   | description           |
| -------- | ------ | --------------------- |
| name     | string | name of the user      |
| fullName | string | full name of the user |
| email    | string | email of the user     |
| phone    | string | phone of the user     |
| imageId  | string | imageId of the user   |

### Request Example

```typescript
PUT`/user/1`;

const body = {
  name: 'Jane',
  email: 'Jane@mermer.cc',
  fullName: 'Jane Doe',
  phone: '1234567890',
  imageId: 'imageId',
};
```

## Response

### Response Parameters

| name    | type    | description                  |
| ------- | ------- | ---------------------------- | --- | ------------------- |
| powerby | string  | iSunFA v0.1.2+50             |
| success | boolean | true or false                |
| code    | string  | response code                |
| message | string  | description of response data |
| payload | user    |                              | {}  | response data or {} |

### user

| name         | type   | description                         |
| ------------ | ------ | ----------------------------------- |
| id           | string | the unique identifier for the user  |
| name         | string | the user's name                     |
| fullName     | string | the user's full name (optional)     |
| email        | string | the user's email address (optional) |
| phone        | string | the user's phone number (optional)  |
| credentialId | string | the credential ID                   |
| publicKey    | string | the public key                      |
| algorithm    | string | the encryption algorithm used       |
| imageId      | string | avatar of the user                  |

### Response Example

- 成功的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": true,
    "code": "200",
    "message": "Update User sucessfully",
    "payload": {
      "id": "1",
      "name": "John",
      "fullName": "John Doe",
      "email": "john@mermer.cc",
      "phone": "12345678",
      "credentialId": "1",
      "publicKey": "public-key",
      "algorithm": "ES256"
    }
  }
  ```
- 失敗的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "404",
    "message": "Resource not found",
    "payload": {}
  }
  ```

# getUnprocessJournal

## description:

- This API can return all Journal process that are not yet bond to certain invoice, which means it
  will return the journal that contain aichResultId, but have null value on "invoiceId" and
  "voucherId"
- need to provide "companyId"

-

## Request

### Request url

```typescript
GET`/company/:companyId/unprocess_journal`;
```

### Query

| name      | type   | description                                          | required | default |
| --------- | ------ | ---------------------------------------------------- | -------- | ------- |
| companyId | string | specific company number, will be used on query to db | yes      | -       |

### Request Example

```typescript
GET`/company/1/unprocess_journal`;
```

## Response

### Response Parameters

| name    | type                    | description                  |
| ------- | ----------------------- | ---------------------------- |
| powerby | string                  | iSunFA v0.1.2+50             |
| success | boolean                 | true or false                |
| code    | string                  | response code                |
| message | string                  | description of response data |
| payload | IUnprocessedJournal\[\] | response data or \[\]        |

### IUnprocessedJournal

| name         | type           | description                                                                                                                     |
| ------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| id           | number         | the unique identifier for the **journal**                                                                                       |
| aichResultId | string         | for asking result                                                                                                               |
| imageName    | string         | the name of image (contain File extension)                                                                                      |
| imageUrl     | string         | the url for frontend to show image                                                                                              |
| imageSize    | string         | the size of image, ex: "10 KB" or "10 MB", round to 2 below decimal point                                                       |
| progress.    | number         | 0~100 Interger, is count by (time already consumed)/(default average Ocr process time), will be set to 100 if status is success |
| status       | ProgressStatus | the status of OCR anlyzing                                                                                                      |
| createdAt    | int            | timestamp in second                                                                                                             |

```ts
export interface IUnprocessedJournal {
  id: number;
  aichResultId: string;
  imageName: string;
  imageUrl: string;
  imageSize: number;
  progress: number; // 0 ~ 100 Int
  status: ProgressStatus;
  createdAt: number;
}
```

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.4+9",
  "success": true,
  "code": "200ISF0002",
  "message": "Get successfully",
  "payload": [
    {
      "id": 10,
      "aichResultId": "b6e8a6c6e7",
      "imageName": "fe5777f95525b34467b76dc06.jpg",
      "imageUrl": "/api/v1/company/invoice/fe5777f95525b34467b76dc06.jpg/image",
      "imageSize": "487.03 KB",
      "progress": 99,
      "status": "systemError",
      "createdAt": 1716344188
    },
    {
      "id": 11,
      "aichResultId": "81d677209c",
      "imageName": "fe5777f95525b34467b76dc07.jpg",
      "imageUrl": "/api/v1/company/invoice/fe5777f95525b34467b76dc07.jpg/image",
      "imageSize": 289.8408203125,
      "progress": 99,
      "status": "llmError",
      "createdAt": 1716344188
    }
  ]
}
```

- 失敗的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "500ISF0002",
    "message": "Database create failed",
    "payload": []
  }
  ```

# listProject

- description: This API provides the functionality to list all projects.

## Request

### Request URL

```typescript
GET`/company/:companyId/project`;
```

### Request Example

```typescript
GET`/company/1/project`;
```

## Response

### Response Parameters

| name    | type            | description                              |
| ------- | --------------- | ---------------------------------------- |
| powerby | string          | iSunFA v0.1.2+50                         |
| success | boolean         | Indicates if the API call was successful |
| code    | string          | HTTP response code                       |
| message | string          | Description of the response              |
| payload | Project[] \| {} | project object or {}                     |

### Project

| name           | type     | description                           |
| -------------- | -------- | ------------------------------------- |
| id             | string   | unique identifier for the project     |
| companyId      | string   | unique identifier for the company     |
| imageId        | string   | unique identifier for the project     |
| name           | string   | name of the project                   |
| income         | number   | total income of the project           |
| expense        | number   | total expenses of the project         |
| profit         | number   | total profit of the project           |
| contractAmount | number   | total contract amount of the project  |
| stage          | string   | current stage of the project          |
| members        | Member[] | list of usernames of project members  |
| createdAt      | number   | timestamp for the project creation    |
| updatedAt      | number   | timestamp for the project last update |

### Member

| name    | type   | description               |
| ------- | ------ | ------------------------- |
| name    | string | name of the member        |
| imageId | string | id for the member's image |

### Response Example

- Success Response

```typescript
{
  "powerby": "iSunFA v0.1.2+50",
  "success": true,
  "code": "200",
  "message": "List projects successfully",
  "payload": [
    {
      id: "1",
      companyId: "1",
      imageId: "1",
      name: "Project 1",
      income: 1000,
      expense: 500,
      profit: 500,
      contractAmount: 2000,
      stage: "Selling",
      members: [
        {
          name: "John",
          imageId: "1"
        }
      ],
      createdAt: 1630000000,
      updatedAt: 1630000000
    },
    {
      id: "2",
      companyId: "1",
      imageId: "2",
      name: "Project 2",
      income: 2000,
      expense: 1000,
      profit: 1000,
      contractAmount: 3000,
      stage: "Designing",
      members: [
        {
          name: "Jane",
          imageId: "2"
        }
      ],
      createdAt: 1630000000,
      updatedAt: 1630000000
    }
  ]
}
```

- Failure Response

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "404",
  "message": "Resource not found",
  "payload": {}
}
```

# getAProject

- Description: Retrieve a project with the specified details including the project name, stage, and
  team members...

## Request

### Request URL

```
GET /company/:companyId/project/:projectId
```

### Query

| name      | type   | description                       | required |
| --------- | ------ | --------------------------------- | -------- |
| projectId | string | Unique identifier for the project | true     |

### Request Example

```typescript
GET / company / 1 / project / 3;
```

## Response

### Response Parameters

| name    | type          | description                              |
| ------- | ------------- | ---------------------------------------- |
| powerby | string        | iSunFA v0.1.2+50                         |
| success | boolean       | Indicates if the API call was successful |
| code    | string        | HTTP response code                       |
| message | string        | Description of the response              |
| payload | Project \| {} | project object or {}                     |

### Project

| name           | type     | description                           |
| -------------- | -------- | ------------------------------------- |
| id             | string   | unique identifier for the project     |
| companyId      | string   | unique identifier for the company     |
| imageId        | string   | unique identifier for the project     |
| name           | string   | name of the project                   |
| income         | number   | total income of the project           |
| expense        | number   | total expenses of the project         |
| profit         | number   | total profit of the project           |
| contractAmount | number   | total contract amount of the project  |
| stage          | string   | current stage of the project          |
| members        | Member[] | list of usernames of project members  |
| createdAt      | number   | timestamp for the project creation    |
| updatedAt      | number   | timestamp for the project last update |

### Member

| name    | type   | description               |
| ------- | ------ | ------------------------- |
| name    | string | name of the member        |
| imageId | string | id for the member's image |

### Response Example

- Success Response

```typescript
{
  "powerby": "iSunFA v0.1.2+50",
  "success": true,
  "code": "200",
  "message": "get a project successfully",
  "payload": {
    id: "3",
    companyId: "1",
    imageId: "3",
    name: "Project 3",
    income: 1000,
    expense: 500,
    profit: 500,
    contractAmount: 2000,
    stage: "Selling",
    members: [
      {
        name: "Eva",
        imageId: "3"
      }
    ],
    createdAt: 1630000000,
    updatedAt: 1630000000
  };
}
```

- Failure Response

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "404",
  "message": "Resource not found",
  "payload": {}
}
```

# updateAProject

- Description: Update a project with the specified details including the project name, stage, and
  team members.

## Request

### Request URL

```
PUT /company/:companyId/project/:projectId
```

### Query

| name      | type   | description                       | required |
| --------- | ------ | --------------------------------- | -------- |
| projectId | string | Unique identifier for the project | yes      |

### Body

### updateProject

| name    | type     | description                          |
| ------- | -------- | ------------------------------------ |
| name    | string   | name of the project                  |
| stage   | string   | current stage of the project         |
| members | string[] | list of usernames of project members |

### Request Example

```typescript
PUT / company / 1 / project / 3;

const body = {
  name: 'Project 3A',
  stage: 'Selling',
  members: ['Eva'],
};
```

## Response

### Response Parameters

| name    | type          | description                              |
| ------- | ------------- | ---------------------------------------- |
| powerby | string        | iSunFA v0.1.2+50                         |
| success | boolean       | Indicates if the API call was successful |
| code    | string        | HTTP response code                       |
| message | string        | Description of the response              |
| payload | Project \| {} | project object or {}                     |

### Project

| name           | type     | description                           |
| -------------- | -------- | ------------------------------------- |
| id             | string   | unique identifier for the project     |
| companyId      | string   | unique identifier for the company     |
| imageId        | string   | unique identifier for the project     |
| name           | string   | name of the project                   |
| income         | number   | total income of the project           |
| expense        | number   | total expenses of the project         |
| profit         | number   | total profit of the project           |
| contractAmount | number   | total contract amount of the project  |
| stage          | string   | current stage of the project          |
| members        | Member[] | list of usernames of project members  |
| createdAt      | number   | timestamp for the project creation    |
| updatedAt      | number   | timestamp for the project last update |

### Member

| name    | type   | description               |
| ------- | ------ | ------------------------- |
| name    | string | name of the member        |
| imageId | string | id for the member's image |

### Response Example

- Success Response

```typescript
{
  "powerby": "iSunFA v0.1.2+50",
  "success": true,
  "code": "200",
  "message": "update project",
  "payload": {
    id: "3",
    companyId: "1",
    imageId: "3",
    name: "Project 3A",
    income: 1000,
    expense: 500,
    profit: 500,
    contractAmount: 2000,
    stage: "Selling",
    members: [
      {
        name: "Eva",
        imageId: "3"
      }
    ],
    createdAt: 1630000000,
    updatedAt: 1630000000
  };
}
```

- Failure Response

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "404",
  "message": "Resource not found",
  "payload": {}
}
```

# updateProjectImage

- description: update project image

## Request

### Request url

```typescript
PUT /company/:companyId/project/:projectId/image
```

### Request Example

```typescript
PUT / company / 1 / project / 3 / image;
```

### Body

| name     | type     | description                                                        | require | default |
| -------- | -------- | ------------------------------------------------------------------ | ------- | ------- |
| formData | FormData | Need to use `new FormData` to post images (see example down below) | true    | -       |

formData內包含

| name | type     | description       | require | default |
| ---- | -------- | ----------------- | ------- | ------- |
| file | File\[\] | An array of Image | true    | -       |

### Request Example

```ts
const formData = new FormData();
formData.append('file', [file]);

const body = formData;
```

## Response

### Response Parameters

| name    | type    | description                  |
| ------- | ------- | ---------------------------- |
| powerby | string  | iSunFA v0.1.2+50             |
| success | boolean | true or false                |
| code    | string  | response code                |
| message | string  | description of response data |
| payload | Project | response data                |

### Project

| name           | type     | description                           |
| -------------- | -------- | ------------------------------------- |
| id             | string   | unique identifier for the project     |
| companyId      | string   | unique identifier for the company     |
| imageId        | string   | unique identifier for the project     |
| name           | string   | name of the project                   |
| income         | number   | total income of the project           |
| expense        | number   | total expenses of the project         |
| profit         | number   | total profit of the project           |
| contractAmount | number   | total contract amount of the project  |
| stage          | string   | current stage of the project          |
| members        | Member[] | list of usernames of project members  |
| createdAt      | number   | timestamp for the project creation    |
| updatedAt      | number   | timestamp for the project last update |

### Member

| name    | type   | description               |
| ------- | ------ | ------------------------- |
| name    | string | name of the member        |
| imageId | string | id for the member's image |

### Response Example

- Success Response

```typescript
{
  "powerby": "iSunFA v0.1.2+50",
  "success": true,
  "code": "200",
  "message": "update project",
  "payload": {
    id: "3",
    companyId: "1",
    imageId: "3",
    name: "Project 3A",
    income: 1000,
    expense: 500,
    profit: 500,
    contractAmount: 2000,
    stage: "Selling",
    members: [
      {
        name: "Eva",
        imageId: "3"
      }
    ],
    createdAt: 1630000000,
    updatedAt: 1630000000
  };
}
```

- Failure Response

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "404",
  "message": "Resource not found",
  "payload": {}
}
```

# deleteAProject

- Description: delete a project

## Request

### Request URL

```
DELETE /company/:companyId/project/:projectId
```

### Query

| name      | type   | description                       | required |
| --------- | ------ | --------------------------------- | -------- |
| projectId | string | Unique identifier for the project | yes      |

### Request Example

```typescript
DELETE / company / 1 / project / 3;
```

## Response

### Response Parameters

| name    | type          | description                              |
| ------- | ------------- | ---------------------------------------- |
| powerby | string        | iSunFA v0.1.2+50                         |
| success | boolean       | Indicates if the API call was successful |
| code    | string        | HTTP response code                       |
| message | string        | Description of the response              |
| payload | Project \| {} | project object or {}                     |

### Project

| name           | type     | description                           |
| -------------- | -------- | ------------------------------------- |
| id             | string   | unique identifier for the project     |
| companyId      | string   | unique identifier for the company     |
| imageId        | string   | unique identifier for the project     |
| name           | string   | name of the project                   |
| income         | number   | total income of the project           |
| expense        | number   | total expenses of the project         |
| profit         | number   | total profit of the project           |
| contractAmount | number   | total contract amount of the project  |
| stage          | string   | current stage of the project          |
| members        | Member[] | list of usernames of project members  |
| createdAt      | number   | timestamp for the project creation    |
| updatedAt      | number   | timestamp for the project last update |

### Member

| name    | type   | description               |
| ------- | ------ | ------------------------- |
| name    | string | name of the member        |
| imageId | string | id for the member's image |

### Response Example

- Success Response

```typescript
{
  "powerby": "iSunFA v0.1.2+50",
  "success": true,
  "code": "200",
  "message": "delete project",
  "payload": {
    id: "3",
    companyId: "1",
    imageId: "3",
    name: "Project 3A",
    income: 1000,
    expense: 500,
    profit: 500,
    contractAmount: 2000,
    stage: "Selling",
    members: [
      {
        name: "Eva",
        imageId: "3"
      }
    ],
    createdAt: 1630000000,
    updatedAt: 1630000000
  };
}
```

- Failure Response

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "404",
  "message": "Resource not found",
  "payload": {}
}
```

# getMilestone

- description: This API provides the functionality to get the milestone information.

## Request

### Request URL

```typescript
GET`/company/:companyId/project/:projectId/milestone`;
```

### Request Example

```typescript
GET`/company/1/project/1/milestone`;
```

## Response

### Response Parameters

| name    | type              | description                              |
| ------- | ----------------- | ---------------------------------------- |
| powerby | string            | iSunFA v0.1.2+50                         |
| success | boolean           | Indicates if the API call was successful |
| code    | string            | HTTP response code                       |
| message | string            | Description of the response              |
| payload | Milestone[] \| {} | milestone object or {}                   |

### Milestone

| name      | type   | description                             |
| --------- | ------ | --------------------------------------- |
| id        | string | unique identifier for the milestone     |
| projectId | string | unique identifier for the project       |
| startDate | number | start date of the milestone             |
| endDate   | number | end date of the milestone               |
| status    | string | status of the milestone                 |
| createdAt | number | timestamp for the milestone creation    |
| updatedAt | number | timestamp for the milestone last update |

### Response Example

- Success Response

```typescript
{
  "powerby": "iSunFA v0.1.2+50",
  "success": true,
  "code": "200",
  "message": "Get milestone successfully",
  "payload": [
    {
      id: "1",
      projectId: "1",
      startDate: 1630000000,
      endDate: 1630000000,
      status: "In Progress",
      createdAt: 1630000000,
      updatedAt: 1630000000
    },
    {
      id: "2",
      projectId: "1",
      startDate: 1630000000,
      endDate: 1630000000,
      status: "Completed",
      createdAt: 1630000000,
      updatedAt: 1630000000
    }
  ]
}
```

- Failure Response

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "404",
  "message": "Resource not found",
  "payload": {}
}
```

# updateMilestone

- description: This API provides the functionality to update the milestone information.

## Request

### Request URL

```typescript
PUT`/company/:companyId/project/:projectId/milestone/:milestoneId`;
```

### Body

| name      | type   | description                 |
| --------- | ------ | --------------------------- |
| startDate | number | start date of the milestone |
| endDate   | number | end date of the milestone   |
| status    | string | status of the milestone     |

### Request Example

```typescript
PUT`/company/1/project/1/milestone/1`;

const body = {
  startDate: 1630000000,
  endDate: 1630000000,
  status: 'In Progress',
};
```

## Response

### Response Parameters

| name    | type            | description                              |
| ------- | --------------- | ---------------------------------------- |
| powerby | string          | iSunFA v0.1.2+50                         |
| success | boolean         | Indicates if the API call was successful |
| code    | string          | HTTP response code                       |
| message | string          | Description of the response              |
| payload | Milestone \| {} | milestone object or {}                   |

### Milestone

| name      | type   | description                             |
| --------- | ------ | --------------------------------------- |
| id        | string | unique identifier for the milestone     |
| projectId | string | unique identifier for the project       |
| startDate | number | start date of the milestone             |
| endDate   | number | end date of the milestone               |
| status    | string | status of the milestone                 |
| createdAt | number | timestamp for the milestone creation    |
| updatedAt | number | timestamp for the milestone last update |

### Response Example

- Success Response

```typescript
{
  "powerby": "iSunFA v0.1.2+50",
  "success": true,
  "code": "200",
  "message": "Update milestone successfully",
  "payload": {
    id: "1",
    projectId: "1",
    startDate: 1630000000,
    endDate: 1630000000,
    status: "In Progress",
    createdAt: 1630000000,
    updatedAt: 1630000000
  }
}
```

- Failure Response

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "404",
  "message": "Resource not found",
  "payload": {}
}
```

# getProgress

- description: This API provides the functionality to get the progress information.

## Request

### Request URL

```typescript
GET`/company/:companyId/project/:projectId/progress`;
```

### Request Example

```typescript
GET`/company/1/project/1/progress`;
```

## Response

### Response Parameters

| name    | type         | description                              |
| ------- | ------------ | ---------------------------------------- |
| powerby | string       | iSunFA v0.1.2+50                         |
| success | boolean      | Indicates if the API call was successful |
| code    | string       | HTTP response code                       |
| message | string       | Description of the response              |
| payload | number \| {} | progress object or {}                    |

### Response Example

- Success Response

```typescript
{
  "powerby": "iSunFA v0.1.2+50",
  "success": true,
  "code": "200",
  "message": "Get progress successfully",
  "payload": 50
}
```

- Failure Response

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "404",
  "message": "Resource not found",
  "payload": {}
}
```

# getSale

- description: This API provides the functionality to get the sale information.

## Request

### Request URL

```typescript
GET`/company/:companyId/project/:projectId/sale`;
```

### Request Example

```typescript
GET`/company/1/project/1/sale`;
```

## Response

### Response Parameters

| name    | type       | description                              |
| ------- | ---------- | ---------------------------------------- |
| powerby | string     | iSunFA v0.1.2+50                         |
| success | boolean    | Indicates if the API call was successful |
| code    | string     | HTTP response code                       |
| message | string     | Description of the response              |
| payload | sale \| {} | sale object or {}                        |

### Sale

| name       | type   | description                        |
| ---------- | ------ | ---------------------------------- |
| id         | string | unique identifier for the sale     |
| projectId  | string | unique identifier for the project  |
| date       | number | date of the sale                   |
| totalSales | number | total sales of the project         |
| comparison | number | comparison of the project          |
| createdAt  | number | timestamp for the sale creation    |
| updatedAt  | number | timestamp for the sale last update |

### Response Example

- Success Response

```typescript
{
  "powerby": "iSunFA v0.1.2+50",
  "success": true,
  "code": "200",
  "message": "Get sale successfully",
  "payload": {
    id: "1",
    projectId: "1",
    date: 1630000000,
    totalSales: 1000,
    comparison: 500,
    createdAt: 1630000000,
    updatedAt: 1630000000
  }
}
```

- Failure Response

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "404",
  "message": "Resource not found",
  "payload": {}
}
```

# getValue

- description: This API provides the functionality to get the value information.

## Request

### Request URL

```typescript
GET`/company/:companyId/project/:projectId/value`;
```

### Request Example

```typescript
GET`/company/1/project/1/value`;
```

## Response

### Response Parameters

| name    | type        | description                              |
| ------- | ----------- | ---------------------------------------- |
| powerby | string      | iSunFA v0.1.2+50                         |
| success | boolean     | Indicates if the API call was successful |
| code    | string      | HTTP response code                       |
| message | string      | Description of the response              |
| payload | Value \| {} | value object or {}                       |

### Value

| name                    | type   | description                         |
| ----------------------- | ------ | ----------------------------------- |
| id                      | string | unique identifier for the value     |
| projectId               | string | unique identifier for the project   |
| totalRevenue            | number | total revenue of the project        |
| totalRevenueGrowthIn30d | number | total revenue growth in 30 days     |
| totalExpense            | number | total expenses of the project       |
| netProfit               | number | net profit of the project           |
| netProfitGrowthIn30d    | number | net profit growth in 30 days        |
| netProfitGrowthInYear   | number | net profit growth in a year         |
| createdAt               | number | timestamp for the value creation    |
| updatedAt               | number | timestamp for the value last update |

### Response Example

- Success Response

```typescript
{
  "powerby": "iSunFA v0.1.2+50",
  "success": true,
  "code": "200",
  "message": "Get value successfully",
  "payload": {
    id: "1",
    projectId: "1",
    totalRevenue: 1000,
    totalRevenueGrowthIn30d: 500,
    totalExpense: 500,
    netProfit: 500,
    netProfitGrowthIn30d: 250,
    netProfitGrowthInYear: 1000,
    createdAt: 1630000000,
    updatedAt: 1630000000
  }
}
```

- Failure Response

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "404",
  "message": "Resource not found",
  "payload": {}
}
```

# getWorkRate

- description: This API provides the functionality to get the work rate information.

## Request

### Request URL

```typescript
GET`/company/:companyId/project/:projectId/workrate`;
```

### Request Example

```typescript
GET`/company/1/project/1/workrate`;
```

## Response

### Response Parameters

| name    | type           | description                              |
| ------- | -------------- | ---------------------------------------- |
| powerby | string         | iSunFA v0.1.2+50                         |
| success | boolean        | Indicates if the API call was successful |
| code    | string         | HTTP response code                       |
| message | string         | Description of the response              |
| payload | WorkRate \| {} | work rate object or {}                   |

### WorkRate

| name              | type   | description                                |
| ----------------- | ------ | ------------------------------------------ |
| id                | string | unique identifier for the work rate        |
| employeeProjectId | string | unique identifier for the employee project |
| member            | Member | member object                              |
| involvementRate   | number | involvement rate of the project            |
| expectedHours     | number | expected hours of the project              |
| actualHours       | number | actual hours of the project                |
| createdAt         | number | timestamp for the work rate creation       |
| updatedAt         | number | timestamp for the work rate last update    |

### Member

| name    | type   | description               |
| ------- | ------ | ------------------------- |
| name    | string | name of the member        |
| imageId | string | id for the member's image |

### Response Example

- Success Response

```typescript
{
  "powerby": "iSunFA v0.1.2+50",
  "success": true,
  "code": "200",
  "message": "Get work rate successfully",
  "payload": {
    id: "1",
    employeeProjectId: "1",
    member: {
      name: "John",
      imageId: "1"
    },
    involvementRate: 50,
    expectedHours: 100,
    actualHours: 50,
    createdAt: 1630000000,
    updatedAt: 1630000000
  }
}
```

- Failure Response

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "404",
  "message": "Resource not found",
  "payload": {}
}
```

# listJournal

## Description

Retrieve all journal data.

## Request

### URL

```
GET /company/:companyId/journal
```

## Query

| name        | type    | description                          | required |
| ----------- | ------- | ------------------------------------ | -------- |
| isUploaded  | boolean | Indicates if the journal is uploaded | no       |
| page        | number  | The page number                      | no       |
| pageSize    | number  | The number of items per page         | no       |
| eventType   | string  | The type of event                    | no       |
| sortBy      | string  | The field to sort by                 | no       |
| sortOrder   | string  | The order to sort by                 | no       |
| startDate   | number  | The start date                       | no       |
| endDate     | number  | The end date                         | no       |
| searchQuery | string  | The search query                     | no       |

### Request Example

```
GET /company/1/journal?isUploaded=true&page=1&pageSize=10&eventType=expense&sortBy=createdAt&sortOrder=desc&startDate=1630000000&endDate=1630000000&searchQuery=journal
```

## Response

### Response Parameters

| name    | type                                                | description                             |
| ------- | --------------------------------------------------- | --------------------------------------- |
| powerby | string                                              | iSunFA v0.1.2+50                        |
| success | boolean                                             | true or false                           |
| code    | string                                              | response code                           |
| message | string                                              | description the status of the request   |
| payload | {[key: string]: IPaginatedData<IJournalListItem[]>} | both uploaded and upcoming journal data |

### JOURNAL_EVENT

```
JOURNAL_EVENT {
  UPLOADED = 'JOURNAL.UPLOADED',
  UPCOMING = 'JOURNAL.UPCOMING',
}
```

### IPaginatedData

| name            | type               | description                           |
| --------------- | ------------------ | ------------------------------------- |
| data            | IJournalListItem[] | The journal data                      |
| page            | number             | The page number                       |
| totalPages      | number             | The total number of pages             |
| totalCount      | number             | The total number of items             |
| pageSize        | number             | The number of items per page          |
| hasNextPage     | boolean            | Indicates if there is a next page     |
| hasPreviousPage | boolean            | Indicates if there is a previous page |
| sortOrder       | string             | The order to sort by                  |
| sortBy          | string             | The field to sort by                  |

### IJournalListItem

| name           | type       | description                          |
| -------------- | ---------- | ------------------------------------ |
| id             | number     | The unique identifier of the journal |
| date           | number     | The date of the journal              |
| type           | string     | The type of the journal              |
| particulars    | string     | The particulars of the journal       |
| fromTo         | string     | The from/to of the journal           |
| account        | IAccount[] | The account of the journal           |
| projectName    | string     | The project name of the journal      |
| projectImageId | string     | The project image id of the journal  |
| voucherId      | number     | The voucher id of the journal        |
| voucherNo      | string     | The voucher number of the journal    |

### IAccount

| name    | type    | description                          |
| ------- | ------- | ------------------------------------ |
| id      | number  | The unique identifier of the account |
| debit   | boolean | The debit of the journal             |
| account | string  | The account of the journal           |
| amount  | number  | The amount of the journal            |

### Response Example

- Success Response

```json
{
  "powerby": "iSunFA v0.1.8+51",
  "success": true,
  "code": "200ISF0001",
  "message": "List successfully",
  "payload": {
    "JOURNAL.UPLOADED": {
      "data": [],
      "page": 1,
      "totalPages": 0,
      "totalCount": 0,
      "pageSize": 10,
      "hasNextPage": false,
      "hasPreviousPage": false,
      "sort": [
        {
          "sortBy": "createdAt",
          "sortOrder": "desc"
        },
        {
          "sortBy": "JOURNAL.UPLOADED",
          "sortOrder": ""
        }
      ]
    },
    "JOURNAL.UPCOMING": {
      "data": [
        {
          "id": 10000003,
          "date": 1721635633,
          "type": "payment",
          "particulars": "小熱拿鐵 x1, 合計 1項, $35",
          "fromTo": "全家便利商店股份有限公司",
          "account": [
            {
              "id": 10000018,
              "debit": false,
              "account": "在途現金",
              "amount": 35
            },
            {
              "id": 10000019,
              "debit": true,
              "account": "庫存現金",
              "amount": 35
            }
          ],
          "voucherId": 10000001,
          "voucherNo": "20240722001"
        }
      ],
      "page": 1,
      "totalPages": 1,
      "totalCount": 1,
      "pageSize": 10,
      "hasNextPage": false,
      "hasPreviousPage": false,
      "sort": [
        {
          "sortBy": "createdAt",
          "sortOrder": "desc"
        },
        {
          "sortBy": "JOURNAL.UPCOMING",
          "sortOrder": ""
        }
      ]
    }
  }
}
```

- Failure Response

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "404",
  "message": "Resource not found",
  "payload": {}
}
```

# createAJournal

## Description

Create a journal.

## Request

### URL

```
POST /company/:companyId/journal
```

### Body

| name         | type               | description                                                              |
| ------------ | ------------------ | ------------------------------------------------------------------------ |
| voucherIndex | string             | Index of the voucher within a collection or series.                      |
| invoiceIndex | string             | Index of the invoice associated with the voucher.                        |
| metadatas    | IVoucherMetaData[] | Array of metadata associated with the voucher. (ref. response data type) |
| lineItems    | LineItem[]         | Array of line items detailed in the voucher. (ref. response data type)   |

## Request Example

```
POST /company/:companyId/journal
```

```json
{
  "voucherIndex": "1",
  "invoiceIndex": "1",
  "metadatas": [
    {
      "date": 1713139200000,
      "voucherType": "expense",
      "companyId": "1",
      "companyName": "文中資訊股份有限公司",
      "description": "WSTP會計師工作輔助幫手: 88725, 文中網路版主機授權費用: 8400, 文中工作站授權費用: 6300",
      "reason": "Equipment",
      "projectId": "1",
      "project": "BAIFA",
      "contractId": "1",
      "contract": "Contract123",
      "payment": {
        "isRevenue": false,
        "price": 109725,
        "hasTax": true,
        "taxPercentage": 5,
        "hasFee": false,
        "fee": 0,
        "paymentMethod": "transfer",
        "paymentPeriod": "atOnce",
        "installmentPeriod": 0,
        "paymentAlreadyDone": 0,
        "paymentStatus": "unpaid",
        "progress": 0
      }
    }
  ],
  "lineItems": [
    {
      "lineItemIndex": "20240402001",
      "account": "購買軟體",
      "description": "WSTP會計師工作輔助幫手: 88,725, 文中網路版主機授權費用: 8,400, 文中工作站授權費用: 6,300",
      "debit": true,
      "amount": 10450
    },
    {
      "lineItemIndex": "20240402002",
      "account": "銀行存款",
      "description": "WSTP會計師工作輔助幫手: 88,725, 文中網路版主機授權費用: 8,400, 文中工作站授權費用: 6,300",
      "debit": false,
      "amount": 10450
    }
  ]
}
```

## Response

### Response Parameters

| name    | type        | description                           |
| ------- | ----------- | ------------------------------------- |
| powerby | string      | iSunFA v0.1.2+50                      |
| success | boolean     | true or false                         |
| code    | string      | response code                         |
| message | string      | description the status of the request |
| payload | JournalData | journal data                          |

### JournalData

| name          | type               | description                                         |
| ------------- | ------------------ | --------------------------------------------------- |
| id            | string             | Unique identifier for the journal.                  |
| tokenContract | string             | The contract address for the token.                 |
| tokenId       | string             | Identifier for the specific token.                  |
| voucherIndex  | string             | Index of the voucher within a collection or series. |
| invoiceIndex  | string             | Index of the invoice associated with the voucher.   |
| metadatas     | IVoucherMetaData[] | Array of metadata associated with the voucher.      |
| lineItems     | LineItem[]         | Array of line items detailed in the voucher.        |

### IVoucherMetaData

| name        | type        | description                                      |
| ----------- | ----------- | ------------------------------------------------ |
| date        | number      | The date of the voucher.                         |
| voucherType | VoucherType | The type of the voucher.                         |
| companyId   | string      | Identifier for the company.                      |
| companyName | string      | The name of the vendor or supplier.              |
| description | string      | A brief description of the voucher.              |
| reason      | string      | The reason for the payment.                      |
| projectId   | string      | Identifier for the related project.              |
| project     | string      | The name or description of the related project.  |
| contractId  | string      | Identifier for the related contract.             |
| contract    | string      | The name or description of the related contract. |
| payment     | Payment     | The payment details of the voucher.              |

### VoucherType

| name        | type   | description                      |
| ----------- | ------ | -------------------------------- |
| VoucherType | string | 'receive', 'expense', 'transfer' |

### Payment

| name               | type                    | description                                                                                    |
| ------------------ | ----------------------- | ---------------------------------------------------------------------------------------------- |
| isRevenue          | boolean                 | Indicates if the transaction will generate income. True: money is coming in; false: going out. |
| price              | number                  | The total amount of money involved in the transaction.                                         |
| hasTax             | boolean                 | Specifies whether the amount includes tax.                                                     |
| taxPercentage      | number                  | The tax rate, for example, 0 or 5, etc.                                                        |
| hasFee             | boolean                 | Indicates whether there is a handling fee included.                                            |
| fee                | number                  | The amount of the handling fee.                                                                |
| paymentMethod      | string                  | The method by which money is received or paid out.                                             |
| paymentPeriod      | PaymentPeriodType       | The timing of payment, either at once (atOnce) or in installments (installment).               |
| installmentPeriod  | number                  | The number of installments for payment.                                                        |
| paymentAlreadyDone | number                  | The amount of money that has already been paid or collected.                                   |
| paymentStatus      | PaymentStatusType(enum) | The status of the payment. "paid" or "unpaid" or "partial                                      |
| progress           | number                  | The actual work completion percentage for a contract, not referring to payment progress.       |

### PaymentPeriodType

| name              | type   | description             |
| ----------------- | ------ | ----------------------- |
| PaymentPeriodType | string | 'atOnce', 'installment' |

### LineItem

| name          | type    | description                                                |
| ------------- | ------- | ---------------------------------------------------------- |
| lineItemIndex | string  | The unique index of the line item entry.                   |
| account       | string  | The account associated with the line item.                 |
| description   | string  | A detailed description of the line item.                   |
| debit         | boolean | Indicates if the item is a debit (true) or credit (false). |
| amount        | number  | The monetary amount of the line item.                      |

### Response Example

- Success Response

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": true,
  "code": "201",
  "message": "Created successfully",
  "payload": {
    "id": "1",
    "tokenContract": "0x00000000219ab540356cBB839Cbe05303d7705Fa",
    "tokenId": "37002036",
    "voucherIndex": "1",
    "invoiceIndex": "1",
    "metadatas": [
      {
        "date": 1713139200000,
        "voucherType": "expense",
        "companyId": "1",
        "companyName": "文中資訊股份有限公司",
        "description": "WSTP會計師工作輔助幫手: 88725, 文中網路版主機授權費用: 8400, 文中工作站授權費用: 6300",
        "reason": "Equipment",
        "projectId": "1",
        "project": "BAIFA",
        "contractId": "1",
        "contract": "Contract123",
        "payment": {
          "isRevenue": false,
          "price": 109725,
          "hasTax": true,
          "taxPercentage": 5,
          "hasFee": false,
          "fee": 0,
          "paymentMethod": "transfer",
          "paymentPeriod": "atOnce",
          "installmentPeriod": 0,
          "paymentAlreadyDone": 0,
          "paymentStatus": "unpaid",
          "progress": 0
        }
      }
    ],
    "lineItems": [
      {
        "lineItemIndex": "20240402001",
        "account": "購買軟體",
        "description": "WSTP會計師工作輔助幫手: 88,725, 文中網路版主機授權費用: 8,400, 文中工作站授權費用: 6,300",
        "debit": true,
        "amount": 10450
      },
      {
        "lineItemIndex": "20240402002",
        "account": "銀行存款",
        "description": "WSTP會計師工作輔助幫手: 88,725, 文中網路版主機授權費用: 8,400, 文中工作站授權費用: 6,300",
        "debit": false,
        "amount": 10450
      }
    ]
  }
}
```

- Failure Response

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "422",
  "message": "Invalid input voucher body to journal",
  "payload": {}
}
```

# createInvoice

- description:
  - Upload Invoice Data in `ISFMK00052`，body need to match `IInvoice` when POSTing.
  - If ocrId is provided, meaning that the invoice data is coming from AICH, and ocr data already
    exist in database, by providing ocrId, the ocr data woll be connect to Journal.
  - `companyId` in the url has no use (can be any number or string), companyId will be retrieve from
    cookie instead
  - logic flow:
    - 1. Check companyId from cookie is valid
    - 2. Format Body to IInvoice
    - 3. Format ocrId, it can be rather null or **number** (need to provided in body)
    - 4. upload IInvoice to AICH
    - 5. If journalId is null, create a new journal than create a new invoice, connect journalId to
         invoice, otherwise update the invoice that has certain journalId
    - 6. Return the resultId and status of the invoice (IAccountResultStatus)

## Request

### Request url

```
POST /company/:companyId/invoice
```

### Body

- Body should include `invoice: IInvoice` interface
- `ocrId` is optional, if provided, it need to be a string of number

| name             | type           | description                                                                                                                                                                                                                            |
| ---------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ocrId (optional) | number \| null | The index of ocr in Database, need to be **numaric string**, it can be retrieve from `IUnprocessedOCR`, which can be fetch by `GET /OCR`, if "null", it will be consider as user skip OCR process and upload new journal by user input |
| invoice          | IInvoice       | The invoice data that need to be upload to AICH, and create a new journal in database.                                                                                                                                                 |

ex:

```
{
    "invoice": IInvoice
}
```

or

```
{
    "ocrId": 123456
    "invoice": IInvoice,
}
```

#### IInvoice

| name             | type          | description                                            |
| ---------------- | ------------- | ------------------------------------------------------ |
| journalId        | null          | this value is not required, just use null              |
| date             | number        | The timestamp representing the date and time. (second) |
| eventType        | EventType     | The type of event ('income', 'payment', 'transfer').   |
| paymentReason    | string        | The reason for the payment.                            |
| description      | string        | A description of the transaction.                      |
| vendorOrSupplier | string        | The name of the vendor or supplier involved.           |
| projectId        | string \|null | The identifier for the project. (can be null )         |
| project          | string \|null | The name of the project. (can be null )                |
| contractId       | string \|null | The unique identifier for the contract. (can be null ) |
| contract         | string \|null | The name or title of the contract. (can be null )      |
| payment          | Payment       | A object containing payment details.                   |

#### Payment

| name              | type                     | description                                                                                    |
| ----------------- | ------------------------ | ---------------------------------------------------------------------------------------------- |
| isRevenue         | boolean                  | Indicates if the transaction will generate income. True: money is coming in; false: going out. |
| price             | number                   | The total amount of money involved in the transaction.                                         |
| hasTax            | boolean                  | Specifies whether the amount includes tax.                                                     |
| taxPercentage     | number                   | The tax rate, for example, 0 or 5, etc.                                                        |
| hasFee            | boolean                  | Indicates whether there is a handling fee included.                                            |
| fee               | number                   | The amount of the handling fee.                                                                |
| method            | string                   | The method by which money is received or paid out.                                             |
| period            | PaymentPeriodType (enum) | The timing of payment, either at once (atOnce) or in installments (installment).               |
| installmentPeriod | number                   | The number of installments for payment.                                                        |
| alreadyPaid       | number                   | The amount of money that has already been paid or collected.                                   |
| status            | PaymentStatusType(enum)  | The status of the payment. "paid" or "unpaid" or "partial                                      |
| progress          | number                   | The actual work completion percentage for a contract, not referring to payment progress.       |

```ts
export interface IInvoice {
  journalId: number | null;
  date: number; // timestamp
  eventType: EventType;
  paymentReason: string;
  description: string;
  vendorOrSupplier: string;
  projectId: number | null;
  project: string | null;
  contractId: number | null;
  contract: string | null;
  payment: IPayment;
}
```

### Body example

```json
{
  "ocrId": 2,
  "invoice": {
    "journalId": null,
    "date": 1715356800,
    "eventType": "income",
    "paymentReason": "Buy a cup of coffee",
    "description": "CCC",
    "vendorOrSupplier": "Carrefour",
    "project": "None",
    "projectId": null,
    "contract": "None",
    "contractId": null,
    "payment": {
      "isRevenue": true,
      "price": 2320,
      "hasTax": true,
      "taxPercentage": 0,
      "hasFee": false,
      "fee": 0,
      "period": "atOnce",
      "method": "Cash",
      "installmentPeriod": 0,
      "alreadyPaid": 0,
      "status": "unpaid",
      "progress": 57
    }
  }
}
```

or

```json
{
  "invoice": {
    "journalId": null,
    "date": 1715356800,
    "eventType": "income",
    "paymentReason": "Buy a cup of coffee",
    "description": "CCC",
    "vendorOrSupplier": "Carrefour",
    "project": "None",
    "projectId": null,
    "contract": "None",
    "contractId": null,
    "payment": {
      "isRevenue": true,
      "price": 2320,
      "hasTax": true,
      "taxPercentage": 0,
      "hasFee": false,
      "fee": 0,
      "period": "atOnce",
      "method": "Cash",
      "installmentPeriod": 0,
      "alreadyPaid": 0,
      "status": "unpaid",
      "progress": 57
    }
  }
}
```

### Response

### Response Parameters

| name    | type                 | description                           |
| ------- | -------------------- | ------------------------------------- |
| powerby | string               | iSunFA v0.1.2+50                      |
| success | boolean              | true or false                         |
| code    | string               | response code                         |
| message | string               | description the status of the request |
| payload | payload(check below) | -                                     |

### payload

| name         | type                 | description                                                                                         |
| ------------ | -------------------- | --------------------------------------------------------------------------------------------------- |
| journalId    | number               | the unique index for the journal in the database, it's the journal that has been updated or created |
| resultStatus | IAccountResultStatus | the result status of AICH of the invoice                                                            |

### IAccountResultStatus

| name     | type           | description                       |
| -------- | -------------- | --------------------------------- |
| resultId | string         | the id of the result              |
| status   | ProgressStatus | the progress status of the result |

### ProgressStatus

| name                 | type   | description                                  |
| -------------------- | ------ | -------------------------------------------- |
| ProgressStatus(enum) | string | 'inProgress','alreadyUpload', 'invalidInput' |

- 成功的回傳：

```json
{
  "powerby": "iSunFA v0.1.4+78",
  "success": true,
  "code": "201ISF0000",
  "message": "Created successfully",
  "payload": {
    "journalId": 2,
    "resultStatus": {
      "resultId": "717316182a",
      "status": "alreadyUpload"
    }
  }
}
```

- 失敗的回傳：Due to the fact that aichResultId has `@unique` constrain, if same aichResultId was
  return from AICH, it will cause "Database create failed", and no data be created

```json
{
  "powerby": "iSunFA v0.1.4+10",
  "success": false,
  "code": "500ISF0002",
  "message": "Database create failed",
  "payload": {}
}
```

# getAnInvoice

## Description

Get an invoice data.

## Request

### Request url

```
GET /company/:companyId/invoice/:invoiceId
```

### Param

| name      | type   | description | require | default |
| --------- | ------ | ----------- | ------- | ------- |
| invoiceId | string | invoice id  | true    | -       |

### Request Example

```
GET /company/1/invoice/1
```

## Response

### Response Parameters

| name    | type    | description                           |
| ------- | ------- | ------------------------------------- |
| powerby | string  | iSunFA v0.1.2+50                      |
| success | boolean | true or false                         |
| code    | string  | response code                         |
| message | string  | description the status of the request |
| payload | Invoice | invoice data                          |

### Invoice

| name             | type      | description                                              |
| ---------------- | --------- | -------------------------------------------------------- |
| journalId        | number    | the unique id of the journal                             |
| date             | number    | timestamp, date of invoice occur                         |
| eventType        | EventType | 'income', 'payment', 'transfer'                          |
| paymentReason    | string    | which account（會計科目） should this invoice belongs to |
| venderOrSupplier | string    | the company that pay money                               |
| description      | string    | text to describe why invoice is existed                  |
| project          | string    | the name of related project                              |
| projectId        | number    | the id of related project                                |
| contract         | string    | the name of related contract                             |
| contractId       | number    | the id of related contract                               |
| payment          | Payment   | the payment information                                  |

### Payment

| name              | type                    | description                                                                                    |
| ----------------- | ----------------------- | ---------------------------------------------------------------------------------------------- |
| isRevenue         | boolean                 | Indicates if the transaction will generate income. True: money is coming in; false: going out. |
| price             | number                  | The total amount of money involved in the transaction.                                         |
| hasTax            | boolean                 | Specifies whether the amount includes tax.                                                     |
| taxPercentage     | number                  | The tax rate, for example, 0 or 5, etc.                                                        |
| hasFee            | boolean                 | Indicates whether there is a handling fee included.                                            |
| fee               | number                  | The amount of the handling fee.                                                                |
| method            | string                  | The method by which money is received or paid out.                                             |
| period            | PaymentPeriodType(enum) | The timing of payment, either at once ('atOnce') or in installments ('installment').           |
| installmentPeriod | number                  | The number of installments for payment.                                                        |
| alreadyPaid       | number                  | The amount of money that has already been paid or collected.                                   |
| status            | PaymentStatusType(enum) | The status of the payment. 'paid' or 'unpaid' or 'partial'                                     |
| progress          | number                  | The actual work completion percentage for a contract, not referring to payment progress.       |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.5+28",
  "success": true,
  "code": "200ISF0002",
  "message": "Get successfully",
  "payload": {
    "journalId": 2,
    "date": 1717430400,
    "eventType": "income",
    "paymentReason": "文書費用",
    "description": "買受人統編:52414797\n營業人統編:51380003\n格式:25\n誠品股份有限公司中山書街分公司\n地址:台北市大同區南京西路16號\n店號:BA01捷運中山店\n序號:04140107\n機號:BA010007\n系統日:2024-04-14 17:19:04",
    "vendorOrSupplier": "誠品股份有限公司中山書街分公司",
    "projectId": null,
    "contractId": null,
    "payment": {
      "isRevenue": true,
      "price": 1223,
      "hasTax": false,
      "taxPercentage": 0,
      "hasFee": false,
      "fee": 0,
      "method": "Cash",
      "period": "atOnce",
      "installmentPeriod": 0,
      "alreadyPaid": 0,
      "status": "unpaid",
      "progress": 0
    }
  }
}
```

- 失敗的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "502",
  "message": "Bad Request",
  "payload": {}
}
```

# updateAnInvoice

- description:
  - Update an invoice in `ISFMK00052`，body need to match IInvoice when POSTing and name it
    `invoice` insite the body. `JournalId` must be not null. This api will use `JournalId` to find
    the invoice to update, not `InvoiceId` provided in the parameter.
  - updated invoice will be resend to AICH, and new aichResultId will be generated and return.

## Request

### Request URL

```
PUT /company/:companyId/invoice/:invoiceId
```

#### Body

| name    | type     | description                                                                            |
| ------- | -------- | -------------------------------------------------------------------------------------- |
| invoice | IInvoice | The invoice data that need to be upload to AICH, and create a new journal in database. |

ex:

```json
{
    "invoice": IInvoice
}
```

#### IInvoice

| name             | type          | description                                                                              |
| ---------------- | ------------- | ---------------------------------------------------------------------------------------- |
| journalId        | number        | The unique identifier for the journal that invoice belongs to, it "**Must**" be provided |
| date             | number        | The timestamp representing the date and time. (second)                                   |
| eventType        | EventType     | The type of event ('income', 'payment', 'transfer').                                     |
| paymentReason    | string        | The reason for the payment.                                                              |
| description      | string        | A description of the transaction.                                                        |
| vendorOrSupplier | string        | The name of the vendor or supplier involved.                                             |
| projectId        | string \|null | The identifier for the project. (can be null )                                           |
| project          | string \|null | The name of the project. (can be null )                                                  |
| contractId       | string \|null | The unique identifier for the contract. (can be null )                                   |
| contract         | string \|null | The name or title of the contract. (can be null )                                        |
| payment          | Payment       | A object containing payment details.                                                     |

#### Payment

| name              | type                     | description                                                                                    |
| ----------------- | ------------------------ | ---------------------------------------------------------------------------------------------- |
| isRevenue         | boolean                  | Indicates if the transaction will generate income. True: money is coming in; false: going out. |
| price             | number                   | The total amount of money involved in the transaction.                                         |
| hasTax            | boolean                  | Specifies whether the amount includes tax.                                                     |
| taxPercentage     | number                   | The tax rate, for example, 0 or 5, etc.                                                        |
| hasFee            | boolean                  | Indicates whether there is a handling fee included.                                            |
| fee               | number                   | The amount of the handling fee.                                                                |
| method            | string                   | The method by which money is received or paid out.                                             |
| period            | PaymentPeriodType (enum) | The timing of payment, either at once (atOnce) or in installments (installment).               |
| installmentPeriod | number                   | The number of installments for payment.                                                        |
| alreadyPaid       | number                   | The amount of money that has already been paid or collected.                                   |
| status            | PaymentStatusType(enum)  | The status of the payment. "paid" or "unpaid" or "partial                                      |
| progress          | number                   | The actual work completion percentage for a contract, not referring to payment progress.       |

##### body example

```json
{
  "invoice": {
    "journalId": 10000000,
    "date": 1715356800,
    "eventType": "income",
    "paymentReason": "Buy a cup of coffee",
    "description": "CCC",
    "vendorOrSupplier": "Carrefour",
    "project": "None",
    "projectId": null,
    "contract": "None",
    "contractId": null,
    "payment": {
      "price": 2320,
      "hasTax": true,
      "taxPercentage": 0,
      "hasFee": false,
      "fee": 0,
      "method": "Cash",
      "installmentPeriod": 0,
      "alreadyPaid": 0,
      "isRevenue": true,
      "progress": 57,
      "period": "atOnce",
      "status": "unpaid"
    }
  }
}
```

## Response

### Response Parameters

| name    | type                 | description                           |
| ------- | -------------------- | ------------------------------------- |
| powerby | string               | iSunFA v0.1.2+50                      |
| success | boolean              | true or false                         |
| code    | string               | response code                         |
| message | string               | description the status of the request |
| payload | payload(check below) | -                                     |

### payload

| name         | type                 | description                                                                                         |
| ------------ | -------------------- | --------------------------------------------------------------------------------------------------- |
| journalId    | number               | the unique index for the journal in the database, it's the journal that has been updated or created |
| resultStatus | IAccountResultStatus | the result status of AICH of the invoice                                                            |

### IAccountResultStatus

| name     | type           | description                       |
| -------- | -------------- | --------------------------------- |
| resultId | string         | the id of the result              |
| status   | ProgressStatus | the progress status of the result |

### ProgressStatus

| name                 | type   | description                                  |
| -------------------- | ------ | -------------------------------------------- |
| ProgressStatus(enum) | string | 'inProgress','alreadyUpload', 'invalidInput' |

- 成功的回傳：

```json
{
  "powerby": "iSunFA v0.1.4+78",
  "success": true,
  "code": "201ISF0000",
  "message": "Update successfully",
  "payload": {
    "journalId": 10000000,
    "resultStatus": {
      "resultId": "717316182a",
      "status": "alreadyUpload"
    }
  }
}
```

- 失敗的回傳：

```json
{
  "powerby": "iSunFA v0.1.4+10",
  "success": false,
  "code": "500ISF0002",
  "message": "Database create failed",
  "payload": {}
}
```

# getAnInvoiceImage

## Description

Get an invoice upload image.

## Request

### Request url

```
GET /company/:companyId/invoice/:invoiceId/image
```

### Param

| name      | type   | description | require | default |
| --------- | ------ | ----------- | ------- | ------- |
| invoiceId | string | invoice id  | true    | -       |

### Request Example

```
GET /company/1/invoice/1/image
```

## Response

### Response Parameters

| name    | type    | description                           |
| ------- | ------- | ------------------------------------- |
| powerby | string  | iSunFA v0.1.2+50                      |
| success | boolean | true or false                         |
| code    | string  | response code                         |
| message | string  | description the status of the request |
| payload | Buffer  | the buffer of the image               |

### Response Example

- 成功的回傳

```json
{
    "powerby": "iSunFA v0.1.2+50",
    "success": true,
    "code": "200",
    "message": "Success",
    "payload": Buffer
}
```

- 失敗的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "404",
  "message": "Resource not found",
  "payload": {}
}
```

# createAnalysisReportJson

# getAnalysisReportJsonStatus

# getAnalysisReportJsonResult

# getReportPending

- description: get all pending report of company, it will return all pending report of company,
  including financial report and analysis report

## Request

### Request URL

```
GET /company/:companyId/report_pending
```

### Query

```
const { targetPage, pageSize, sortBy, sortOrder, startDateInSecond, endDateInSecond, searchQuery } = req.query;
```

| name              | type                                                        | description                                                                    | require | default                 |
| ----------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------ | ------- | ----------------------- |
| targetPage        | numeric                                                     | which page of date you want to check                                           | false   | 1                       |
| pageSize          | numeric                                                     | how many items a page need to return                                           | false   | 10                      |
| sortBy            | 'createdAt' \| 'name' \| 'type' \| 'reportType' \| 'status' | which category to be sort by                                                   | false   | "createdAt"             |
| sortOrder         | 'desc' \| 'asc                                              | is "sortBy" need to be ascent or descent                                       | false   | "desc"                  |
| startDateInSecond | numeric (timestamp in second)                               | items "from" after this date will be selected (Balance sheet won't check this) | false   | 0                       |
| endDateInSecond   | numeric (timestamp in second)                               | items "to" before this date will be selected                                   | false   | Number.MAX_SAFE_INTEGER |
| searchQuery       | string                                                      | keyword use to search name, type, report type                                  | false   | undefined               |

```
GET /company/:companyId/report_pending?targetPage=1&pageSize=10&sortBy=createdAt&sortOrder=desc&startDateInSecond=0&endDateInSecond=1717948800&searchQuery=balance sheet
```

## Response

### Response Parameters

| name    | type                        | description                  |
| ------- | --------------------------- | ---------------------------- |
| powerby | string                      | ISunFa api 1.0.0             |
| success | boolean                     | true or false                |
| code    | string                      | response code                |
| message | string                      | description of response data |
| payload | IPaginatedPendingReportItem | response data                |

#### IPaginatedPendingReportItem

| name      | type                 | description            |
| --------- | -------------------- | ---------------------- |
| data      | IPendingReportItem[] | list of pending report |
| totalPage | number               | total page of item     |
| page      | number               | current page           |

#### IPendingReportItem

| name             | type                                                                                         | description                 |
| ---------------- | -------------------------------------------------------------------------------------------- | --------------------------- |
| id               | string                                                                                       | id of report                |
| name             | string                                                                                       | name of report              |
| createdTimestamp | number                                                                                       | timestamp of report created |
| period           | { startTimestamp: number (means: "from"), endTimestamp: number (means: "to")}                | period of report            |
| type             | ReportType (financial, analysis)                                                             | type of report              |
| reportType       | FinancialReportTypesKey (balance_sheet, comprehensive_income_statement, cash_flow_statement) | report type of report       |
| paused           | boolean                                                                                      | is report paused            |
| remainingSeconds | number                                                                                       | remaining seconds of report |

```ts
export interface IBasicReportItem {
  id: string;
  name: string;
  createdTimestamp: number;
  period: {
    startTimestamp: number;
    endTimestamp: number;
  };
  type: ReportType;
  reportType: FinancialReportTypesKey;
}

export interface IPendingReportItem extends IBasicReportItem {
  paused: boolean;
  remainingSeconds: number;
}
  balance_sheet = 'balance_sheet',
  comprehensive_income_statement = 'comprehensive_income_statement',
  cash_flow_statement = 'cash_flow_statement',
```

### Response Example

- Success Response

```json
{
  "powerby": "iSunFA v0.1.8+51",
  "success": true,
  "code": "201ISF0000",
  "message": "Created successfully",
  "payload": {
    "data": [
      {
        "id": "8888872",
        "name": "Cash Flow Statement-20240505-1",
        "createdTimestamp": 1714897574,
        "period": {
          "startTimestamp": 1695609600,
          "endTimestamp": 1698106883
        },
        "type": "cash_flow_statement",
        "remainingSeconds": 250,
        "paused": true
      },
      {
        "id": "8888875",
        "name": "Balance Sheet-20240501-1",
        "createdTimestamp": 1714508675,
        "period": {
          "startTimestamp": 1698374400,
          "endTimestamp": 1714022400
        },
        "type": "balance_sheet",
        "remainingSeconds": 30,
        "paused": false
      },
      {
        "id": "8888874",
        "name": "Balance Sheet-20240423-1",
        "createdTimestamp": 1713846643,
        "period": {
          "startTimestamp": 1693113600,
          "endTimestamp": 1704096000
        },
        "type": "balance_sheet",
        "remainingSeconds": 3680,
        "paused": false
      },
      {
        "id": "8888871",
        "name": "Cash Flow Statement-20240420-1",
        "createdTimestamp": 1713611226,
        "period": {
          "startTimestamp": 1683043200,
          "endTimestamp": 1704067200
        },
        "type": "cash_flow_statement",
        "remainingSeconds": 10,
        "paused": false
      },
      {
        "id": "8888873",
        "name": "Comprehensive Income Statement-20240412-1",
        "createdTimestamp": 1712863312,
        "period": {
          "startTimestamp": 1685721600,
          "endTimestamp": 1704076800
        },
        "type": "comprehensive_income_statement",
        "remainingSeconds": 1615,
        "paused": false
      }
    ],
    "page": 1,
    "totalPages": 1
  }
}
```

- Error response

```json
{
  "powerby": "iSunFA v0.1.8+51",
  "success": true,
  "code": "201ISF0000",
  "message": "Created successfully",
  "payload": null
}
```

# getProfitComparison

- description: This API provides the functionality to query income, expenses of each project within
  the designed period.

## Request

### Request url

```typescript
GET`/company/:companyId/profit_comparison`;
```

### Query

| name         | type   | description                                   | required | default |
| ------------ | ------ | --------------------------------------------- | -------- | ------- |
| startDate    | string | the start date of the period, timestamp       | yes      | -       |
| endDate      | string | the end date of the period, timestamp         | yes      | -       |
| currentPage  | string | which page of projects you want to get        | no       | 1       |
| itemsPerPage | string | how many projects you want to get in one page | no       | 10      |

### Request Example

- example

```typescript
GET`/company/1/profit_comparison?startDate=1717171200&endDate=1718294399`;
```

## Response

### Response Parameters

| name    | type                                              | description                  |
| ------- | ------------------------------------------------- | ---------------------------- |
| powerby | string                                            | iSunFA v0.1.2+50             |
| success | boolean                                           | true or false                |
| code    | string                                            | response code                |
| message | string                                            | description of response data |
| payload | ProjectROIComparisonChartDataWithPagination \| {} | response data                |

### ProjectROIComparisonChartDataWithPaginationAndDate

| name        | type       | description                                   |
| ----------- | ---------- | --------------------------------------------- |
| startDate   | number     | timestamp, the start date of the period       |
| endDate     | number     | timestamp, the end date of the period         |
| currentPage | number     | current page                                  |
| totalPages  | number     | total pages                                   |
| categories  | string[]   | all names of the projects                     |
| series      | number[][] | income, expenses of each project in two array |
| empty       | boolean    | check if categories is empty                  |

### Response Example

- 成功的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": true,
    "code": "200",
    "message": "Get successfully",
    "payload": {
      "startDate": 1711929600,
      "endDate": 1714521600,
      "currentPage": 1,
      "totalPages": 1,
      "categories": [
        "iSunFA",
        "BAIFA",
        "iSunOne",
        "TideBit",
        "ProjectE",
        "ProjectF",
        "ProjectG",
        "ProjectH",
        "ProjectI",
        "ProjectJ"
      ],
      "series": [
        [170000, 2000000, 250000, 170000, 2000000, 250000, 170000, 2000000, 250000, 170000],
        [150000, 1500000, 80000, 150000, 1500000, 80000, 150000, 1500000, 80000, 150000]
      ],
      "empty": false
    }
  }
  ```
- 失敗的回傳

  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "422",
    "message": "Invalid input parameter",
    "payload": {}
  }
  ```

# getProjectProgress

- description: This API provides the functionality to query numbers of how many projects within each
  progress status.

## Request

### Request url

```typescript
GET`/company/:companyId/project_progress`;
```

### Query

| name | type   | description                | required | default |
| ---- | ------ | -------------------------- | -------- | ------- |
| date | string | the date you want to query | yes      | -       |

### Request Example

- example

```typescript
GET`/company/1/project_progress?date=2024-03-01`;
```

## Response

### Response Parameters

| name    | type                           | description                  |
| ------- | ------------------------------ | ---------------------------- |
| powerby | string                         | iSunFA v0.1.2+50             |
| success | boolean                        | true or false                |
| code    | string                         | response code                |
| message | string                         | description of response data |
| payload | ProjectProgressChartData \| {} | response data                |

### ProjectProgressChartData

| name       | type     | description                                                                     |
| ---------- | -------- | ------------------------------------------------------------------------------- |
| date       | number   | timestamp, the date you query                                                   |
| categories | string[] | progress status array                                                           |
| series     | object[] | contain name and array data of how many projects corresponding to each progress |
| empty      | boolean  | check if series number is empty                                                 |

### Response Example

- 成功的回傳
  ```json
  {
      "powerby": "iSunFA v0.1.2+50",
      "success": true,
      "code":  "200",
      "message": "Get successfully",
      "payload": {
        "date": 1711929600,
        "categories": [ "Designing", "Beta Testing", "Develop", "Sold", "Selling", "Archived" ],
        "series": [
          {
            "name": "Projects",
            "data": [ 2, 3, 2, 3, 2, 1 ]
          }
        ]
      "empty": false
      }
  }
  ```
- 失敗的回傳

  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "422",
    "message": "Invalid input parameter",
    "payload": {}
  }
  ```

# getPeriodProfitValue

- description: This API provides the functionality to query total income, expenses and profit within
  the designed period.

## Request

### Request url

```typescript
GET`/company/:companyId/profit_value`;
```

### Query

| name   | type   | description          | required | default |
| ------ | ------ | -------------------- | -------- | ------- |
| period | string | the period displayed | no       | week    |

### Request Example

- example

```typescript
GET`/company/1/profit_value?period=week`;
```

## Response

### Response Parameters

| name    | type                  | description                  |
| ------- | --------------------- | ---------------------------- |
| powerby | string                | iSunFA v0.1.2+50             |
| success | boolean               | true or false                |
| code    | string                | response code                |
| message | string                | description of response data |
| payload | ProfitValue[] \| null | array of response data       |

### ProfitValue

| name     | type   | description                  |
| -------- | ------ | ---------------------------- |
| income   | number | the income within the date   |
| expenses | number | the expenses within the date |
| date     | date   | the date within the period   |
| profit   | number | the profit within the date   |

### Response Example

- 成功的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": true,
    "code": "200",
    "message": "Get successfully",
    "payload": [
      {
        "date": "2024-03-01",
        "income": 70000,
        "expenses": 50000,
        "profit": 20000
      },
      {
        "date": "2024-03-02",
        "income": 200000,
        "expenses": 130000,
        "profit": 70000
      },
      {
        "date": "2024-03-03",
        "income": 30000,
        "expenses": 20000,
        "profit": 10000
      },
      {
        "date": "2024-03-04",
        "income": 10000,
        "expenses": 5000,
        "profit": 5000
      },
      {
        "date": "2024-03-05",
        "income": 5000,
        "expenses": 3000,
        "profit": 2000
      },
      {
        "date": "2024-03-06",
        "income": 10000,
        "expenses": 8000,
        "profit": 2000
      },
      {
        "date": "2024-03-07",
        "income": 20000,
        "expenses": 15000,
        "profit": 5000
      }
    ]
  }
  ```
- 失敗的回傳

  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "422",
    "message": "Invalid input parameter",
    "payload": {}
  }
  ```

# getProfitInsight

- description: This API provides the functionality to query overview of total profit growth rate,
  ROI of top project, numbers of projects which are going to be online.

## Request

### Request url

```typescript
GET`/company/:companyId/profit_insight`;
```

### Request Example

- example

```typescript
GET`/company/1/profit_insight`;
```

## Response

### Response Parameters

| name    | type                | description                  |
| ------- | ------------------- | ---------------------------- |
| powerby | string              | iSunFA v0.1.2+50             |
| success | boolean             | true or false                |
| code    | string              | response code                |
| message | string              | description of response data |
| payload | ProfitInsight \| {} | response data                |

### ProfitInsight

| name                  | type    | description                                                              |
| --------------------- | ------- | ------------------------------------------------------------------------ |
| profitChange          | number  | total profit growth rate of all projects compared to previous day        |
| topProjectRoi         | number  | highest ROI among all the projects                                       |
| preLaunchProject      | number  | numbers of projects which are going to be online(progress: beta testing) |
| emptyProfitChange     | boolean | check if today and yesterday profit is empty                             |
| emptyTopProjectRoi    | boolean | check if project is empty                                                |
| emptyPreLaunchProject | boolean | check if pre launch project is empty                                     |

### Response Example

- 成功的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": true,
    "code": "200",
    "message": "Get successfully",
    "payload": {
      "profitChange": -0.1,
      "topProjectRoi": 0.3,
      "preLaunchProject": 5,
      "emptyProfitChange": false,
      "emptyTopProjectRoi": false,
      "emptyPreLaunchProject": false
    }
  }
  ```
- 失敗的回傳

  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "405",
    "message": "Method not allowed",
    "payload": {}
  }
  ```

# getReportGenerated

- description: get all pending report of company, it will return all Generated report of company,
  including financial report and analysis report

## Request

### Request URL

```
GET /company/:companyId/report_generated
```

### Query

```
const { targetPage, pageSize, sortBy, sortOrder, startDateInSecond, endDateInSecond, searchQuery } = req.query;
```

| name              | type                                                        | description                                                                    | require | default                 |
| ----------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------ | ------- | ----------------------- |
| targetPage        | numeric                                                     | which page of date you want to check                                           | false   | 1                       |
| pageSize          | numeric                                                     | how many items a page need to return                                           | false   | 10                      |
| sortBy            | 'createdAt' \| 'name' \| 'type' \| 'reportType' \| 'status' | which category to be sort by                                                   | false   | "createdAt"             |
| sortOrder         | 'desc' \| 'asc                                              | is "sortBy" need to be ascent or descent                                       | false   | "desc"                  |
| startDateInSecond | numeric (timestamp in second)                               | items "from" after this date will be selected (Balance sheet won't check this) | false   | 0                       |
| endDateInSecond   | numeric (timestamp in second)                               | items "to" before this date will be selected                                   | false   | Number.MAX_SAFE_INTEGER |
| searchQuery       | string                                                      | keyword use to search name, type, report type                                  | false   | undefined               |

```
GET /company/:companyId/report_generated?targetPage=1&pageSize=10&sortBy=createdAt&sortOrder=desc&startDateInSecond=0&endDateInSecond=1717948800&searchQuery=balance sheet
```

## Response

### Response Parameters

| name    | type                          | description                  |
| ------- | ----------------------------- | ---------------------------- |
| powerby | string                        | ISunFa api 1.0.0             |
| success | boolean                       | true or false                |
| code    | string                        | response code                |
| message | string                        | description of response data |
| payload | IPaginatedGeneratedReportItem | response data                |

#### IPaginatedGeneratedReportItem

| name      | type                   | description            |
| --------- | ---------------------- | ---------------------- |
| data      | IGeneratedReportItem[] | list of pending report |
| totalPage | number                 | total page of item     |
| page      | number                 | current page           |

#### IPendingReportItem

| name                   | type                                                                                         | description                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| id                     | string                                                                                       | id of report                                                               |
| name                   | string                                                                                       | name of report                                                             |
| createdTimestamp       | number                                                                                       | timestamp of report created                                                |
| period                 | { startTimestamp: number (means: "from"), endTimestamp: number (means: "to")}                | period of report                                                           |
| type                   | ReportType (financial, analysis)                                                             | type of report                                                             |
| reportType             | FinancialReportTypesKey (balance_sheet, comprehensive_income_statement, cash_flow_statement) | report type of report                                                      |
| project                | { id: string, name: string, code: string }                                                   | id is id of project, name is name of project, code is also name of project |
| reportLinkId           | string                                                                                       | report link id                                                             |
| downloadLink           | string                                                                                       | download link url                                                          |
| blockchainExplorerLink | string                                                                                       | blockchain explorer link url                                               |
| evidenceId             | string                                                                                       | evidence id of report                                                      |

```ts
export interface IBasicReportItem {
  id: string;
  name: string;
  createdTimestamp: number;
  period: {
    startTimestamp: number;
    endTimestamp: number;
  };
  type: ReportType;
  reportType: FinancialReportTypesKey;
}

export interface IGeneratedReportItem extends IBasicReportItem {
  project: {
    id: string;
    name: string;
    code: string;
  } | null;
  reportLinkId: string;
  downloadLink: string;
  blockchainExplorerLink: string;
  evidenceId: string;
}
```

### Response Example

- Success Response

```json
{
  "powerby": "iSunFA v0.1.8+51",
  "success": true,
  "code": "201ISF0000",
  "message": "Created successfully",
  "payload": {
    "data": [
      {
        "id": "10000008",
        "name": "1_Statement of Cash Flows_tw_19750522",
        "createdTimestamp": 1721279742,
        "period": {
          "startTimestamp": 0,
          "endTimestamp": 170000000
        },
        "type": "cashFlowStatement",
        "reportType": "cash_flow_statement",
        "project": null,
        "reportLinkId": "",
        "downloadLink": "",
        "blockchainExplorerLink": "",
        "evidenceId": ""
      },
      {
        "id": "10000007",
        "name": "1_Statement of Comprehensive Income_tw_19750522",
        "createdTimestamp": 1721279682,
        "period": {
          "startTimestamp": 0,
          "endTimestamp": 170000000
        },
        "type": "incomeStatement",
        "reportType": "comprehensive_income_statement",
        "project": null,
        "reportLinkId": "",
        "downloadLink": "",
        "blockchainExplorerLink": "",
        "evidenceId": ""
      },
      {
        "id": "10000006",
        "name": "1_Statement of Financial Position_tw_19750522",
        "createdTimestamp": 1721279656,
        "period": {
          "startTimestamp": 0,
          "endTimestamp": 170000000
        },
        "type": "balanceSheet",
        "reportType": "balance_sheet",
        "project": null,
        "reportLinkId": "",
        "downloadLink": "",
        "blockchainExplorerLink": "",
        "evidenceId": ""
      },
      {
        "id": "8888880",
        "name": "Balance Sheet-20240429-1",
        "createdTimestamp": 1714331987,
        "period": {
          "startTimestamp": 1715270400,
          "endTimestamp": 1717862400
        },
        "type": "balance_sheet",
        "project": {
          "id": "9999993",
          "name": "iSunOne",
          "code": "iSunOne"
        },
        "reportLinkId": "505c1ddbd5d6cb47fc769577d6afaa0410f5c109111111111111111111111111111111111111117",
        "downloadLink": "https: //BFample.com/download/report.pdf",
        "blockchainExplorerLink": "https: //baifa.io/en/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c109111111111111111111111111111111111111117",
        "evidenceId": "505c1ddbd5d6cb47fc769577d6afaa0410f5c109111111111111111111111111111111111111117"
      },
      {
        "id": "8888878",
        "name": "Balance Sheet-20240427-1",
        "createdTimestamp": 1714220640,
        "period": {
          "startTimestamp": 1715443200,
          "endTimestamp": 1718035200
        },
        "type": "balance_sheet",
        "project": {
          "id": "9999992",
          "name": "BAIFA",
          "code": "BAIFA"
        },
        "reportLinkId": "505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007",
        "downloadLink": "https: //BFample.com/download/report.pdf",
        "blockchainExplorerLink": "https: //baifa.io/en/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007",
        "evidenceId": "505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007"
      },
      {
        "id": "8888876",
        "name": "Cash Flow Balance Sheet-20240423-1-20240420-1",
        "createdTimestamp": 1713815673,
        "period": {
          "startTimestamp": 1715616000,
          "endTimestamp": 1718208000
        },
        "type": "balance_sheet",
        "project": null,
        "reportLinkId": "505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007",
        "downloadLink": "https: //BFample.com/download/report.pdf",
        "blockchainExplorerLink": "https: //baifa.io/en/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007",
        "evidenceId": "505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007"
      },
      {
        "id": "8888879",
        "name": "Comprehensive Income Statement-20240422-1",
        "createdTimestamp": 1713755682,
        "period": {
          "startTimestamp": 1715356800,
          "endTimestamp": 1717948800
        },
        "type": "comprehensive_income_statement",
        "project": null,
        "reportLinkId": "505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000011111111111111111111111117",
        "downloadLink": "https: //BFample.com/download/report.pdf",
        "blockchainExplorerLink": "https: //baifa.io/en/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007",
        "evidenceId": "505c1ddbd5d6cb47fc769577d6afaa0410f5c109111111111111111111111111111111111111117"
      },
      {
        "id": "8888877",
        "name": "Cash Flow Statement-20240420-1",
        "createdTimestamp": 1713543101,
        "period": {
          "startTimestamp": 1715529600,
          "endTimestamp": 1718121600
        },
        "type": "cash_flow_statement",
        "project": {
          "id": "9999991",
          "name": "iSunFA",
          "code": "iSunFA"
        },
        "reportLinkId": "505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007",
        "downloadLink": "https: //BFample.com/download/report.pdf",
        "blockchainExplorerLink": "https: //baifa.io/en/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007",
        "evidenceId": "505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007"
      }
    ],
    "page": 1,
    "totalPages": 1
  }
}
```

- Error response

```json
{
  "powerby": "iSunFA v0.1.8+51",
  "success": true,
  "code": "201ISF0000",
  "message": "Created successfully",
  "payload": null
}
```

# getLaborCostChart

- description: This API provides the functionality to get data about labor cost chart.

## Request

### Request url

```typescript
GET`/company/:companyId/labor_cost_chart`;
```

### Query

| name | type   | description                | required | default |
| ---- | ------ | -------------------------- | -------- | ------- |
| date | string | the date you want to query | yes      | -       |

### Request Example

```typescript
GET`/company/1/labor_cost_chart?date=2024-06-19`;
```

## Response

### Response Parameters

| name    | type                     | description                           |
| ------- | ------------------------ | ------------------------------------- |
| powerby | string                   | iSunFA v0.1.2+50                      |
| success | boolean                  | true or false                         |
| code    | string                   | response code                         |
| message | string                   | description of the request            |
| payload | LaborCostChartData \| {} | object of labor cost chart data or {} |

### LaborCostChartData

| Name       | Type     | Description                                                                       |
| ---------- | -------- | --------------------------------------------------------------------------------- |
| date       | number   | The date you request, typically represented as a timestamp.                       |
| categories | string[] | An array of categories for all active projects.                                   |
| series     | number[] | An array of numerical values, each representing the labor costs for each project. |
| empty      | boolean  | check if any cost happened                                                        |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.5+7",
  "success": true,
  "code": "200ISF0002",
  "message": "Get successfully",
  "payload": {
    "date": 1718755200,
    "categories": ["iSunFA", "BAIFA"],
    "series": [90300, 63700],
    "empty": false
  }
}
```

- 失敗的回傳

  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "405",
    "message": "Method not allowed",
    "payload": {}
  }
  ```

# getIncomeExpenseTrendChart

- description: This API provides the functionality to query value of total income, expenses and
  profit within 12 months or years.

## Request

### Request url

```typescript
GET`/company/:companyId/income_expense_trend`;
```

### Query

| name   | type   | description                         | required | default |
| ------ | ------ | ----------------------------------- | -------- | ------- |
| period | string | the period displayed, month or year | no       | month   |

### Request Example

```typescript
GET`/company/1/income_expense_trend?period=month`;
```

## Response

### Response Parameters

| name    | type                              | description                                     |
| ------- | --------------------------------- | ----------------------------------------------- |
| powerby | string                            | iSunFA v0.1.2+50                                |
| success | boolean                           | true or false                                   |
| code    | string                            | response code                                   |
| message | string                            | description of the request                      |
| payload | IncomeExpenseTrendChartData \| {} | object of income expense trend chart data or {} |

### IncomeExpenseTrendChartData

| name        | type                                               | description                                                                                                                                                                |
| ----------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| categories  | string[]                                           | An array of months or years used in the chart.                                                                                                                             |
| series      | { name: string; data: number[]; }[]                | An array of objects, with value related to designated period separately in income, expense, and profit                                                                     |
| annotations | { name: string; data: { absolute: number; }[]; }[] | An array of objects for annotations, each with a name(income, expense, and profit) and a data array containing objects that provide absolute values for designated period. |
| empty       | boolean                                            | check if series or categories is empty                                                                                                                                     |

### Response Example

- 成功的回傳

```json
 {
  "powerby": "iSunFA v0.1.4+37",
  "success": true,
  "code": "200ISF0002",
  "message": "Get successfully",
  "payload": {
    "categories": [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec"
    ],
    "series": [
      {
        "name": "Income",
        "data": [
          0,
          200,
          300,
          40760,
          500,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ]
      },
      {
        "name": "Expense",
        "data": [
          0,
          100,
          200,
          20660,
          400,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ]
      },
      {
        "name": "Profit Status",
        "data": [
          0,
          100,
          100,
          20100,
          100,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ]
      }
    ],
    "annotations": [
      {
        "name": "Income",
        "data": [
          {
            "absolute": 0
          },
          {
            "absolute": 200
          },
          {
            "absolute": 300
          },
          {
            "absolute": 40760
          },
          {
            "absolute": 500
          },
          {
            "absolute": 0
          },
          {
            "absolute": 0
          },
          {
            "absolute": 0
          },
          {
            "absolute": 0
          },
          {
            "absolute": 0
          },
          {
            "absolute": 0
          },
          {
            "absolute": 0
          }
        ]
      },
      {
        "name": "Expense",
        "data": [
          {
            "absolute": 0
          },
          {
            "absolute": 100
          },
          {
            "absolute": 200
          },
          {
            "absolute": 20660
          },
          {
            "absolute": 400
          },
          {
            "absolute": 0
          },
          {
            "absolute": 0
          },
          {
            "absolute": 0
          },
          {
            "absolute": 0
          },
          {
            "absolute": 0
          },
          {
            "absolute": 0
          },
          {
            "absolute": 0
          }
        ]
      },
      {
        "name": "Profit Status",
        "data": [
          {
            "absolute": 0
          },
          {
            "absolute": 100
          },
          {
            "absolute": 100
          },
          {
            "absolute": 20100
          },
          {
            "absolute": 100
          },
          {
            "absolute": 0
          },
          {
            "absolute": 0
          },
          {
            "absolute": 0
          },
          {
            "absolute": 0
          },
          {
            "absolute": 0
          },
          {
            "absolute": 0
          },
          {
            "absolute": 0
          }
        ]
      }
    ]
    "empty": false
 }
```

- 失敗的回傳

  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "405",
    "message": "Method not allowed",
    "payload": {}
  }
  ```

# createInvitation

- description: This API provides the functionality to create an invitation.

## Request

### Request url

```typescript
POST`/company/:companyId/invitation`;
```

### Request Body

| name  | type   | description | require | default |
| ----- | ------ | ----------- | ------- | ------- |
| email | string | email       | true    | -       |
| role  | string | role        | true    | -       |

### Request Example

```typescript
POST / company / 1 / invitation;
const body = {
  email: 'test',
  role: 'admin',
};
```

## Response

### Response Parameters

| name    | type       | description                           |
| ------- | ---------- | ------------------------------------- |
| powerby | string     | iSunFA v0.1.2+50                      |
| success | boolean    | true or false                         |
| code    | string     | response code                         |
| message | string     | description the status of the request |
| payload | invitation | invitation content                    |

### invitation

| name      | type    | description                                |
| --------- | ------- | ------------------------------------------ |
| id        | number  | id of invitation                           |
| roleId    | number  | id of role                                 |
| companyId | nummber | id of company                              |
| code      | string  | code of invitation                         |
| hasUsed   | boolean | whether the invitaion has been used or not |
| expireAt  | number  | expire timestamp of the invitation         |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": true,
  "code": "200",
  "message": "Success",
  "payload": {
    "id": 1,
    "roleId": 1,
    "companyId": 1,
    "code": "123456",
    "hasUsed": false,
    "expireAt": 1711929600
  }
}
```

- 失敗的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "422",
  "message": "Invalid input parameter",
  "payload": {}
}
```

### updateInvitation

- description: This API provides the functionality to update an invitation for inviting a user.

## Request

### Request url

```typescript
PUT`/user/:userId/invitation`;
```

### Request Body

| name           | type   | description        | require | default |
| -------------- | ------ | ------------------ | ------- | ------- |
| invitationCode | string | code of invitation | true    | -       |

### Request Example

```typescript
PUT / user / 1 / invitation;
const body = {
  invitationCode: '123456',
};
```

## Response

### Response Parameters

| name    | type    | description                           |
| ------- | ------- | ------------------------------------- |
| powerby | string  | iSunFA v0.1.2+50                      |
| success | boolean | true or false                         |
| code    | string  | response code                         |
| message | string  | description the status of the request |
| payload | company | company create invitation             |

#### Company

| name      | type    | description                     |
| --------- | ------- | ------------------------------- |
| id        | number  | id of company                   |
| name      | string  | name of company                 |
| code      | string  | code of company                 |
| regional  | string  | regional of company             |
| kycStatus | boolean | kyc status of company           |
| imageId   | string  | image id of company             |
| startDate | number  | start date of the company       |
| createdAt | number  | create timestamp of the company |
| updatedAt | number  | update timestamp of the company |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": true,
  "code": "200",
  "message": "Success",
  "payload": {
    "id": 1,
    "name": "iSunFA",
    "code": "IS",
    "regional": "Taiwan",
    "startDate": 1711929600,
    "createAt": 1711929600,
    "updateAt": 1711929600
  }
}
```

- 失敗的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "422",
  "message": "Invalid input parameter",
  "payload": {}
}
```

# getReportById

- description: This API provides the functionality to get a report by id.

## Request

### Request url

```typescript
GET`/company/:companyId/report/:reportId`;
```

### Request Example

```typescript
GET`/company/1/report/10`;
```

## Param

| name     | type   | description          | required | default |
| -------- | ------ | -------------------- | -------- | ------- |
| reportId | string | the id of the report | yes      | -       |

## Response

### Response Parameters

| name    | type         | description                |
| ------- | ------------ | -------------------------- |
| powerby | string       | iSunFA v0.1.2+50           |
| success | boolean      | true or false              |
| code    | string       | response code              |
| message | string       | description of the request |
| payload | Report \| {} | report info or {}          |

### Report

| Name            | Type                               | Description                                                                                                                                                                                                 |
| --------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| reportTypesName | { id: report type; name: string; } | An object containing the report type and name. Report type can be balance_sheet, comprehensive_income_statement, cash_flow_statement, financial_performance, cost_analysis, hr_utilization, forecast_report |
| tokenContract   | string                             | The address of the token contract.                                                                                                                                                                          |
| tokenId         | string                             | The unique identifier of the token.                                                                                                                                                                         |
| reportLink      | string                             | The link to the report.                                                                                                                                                                                     |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.4+46",
  "success": true,
  "code": "200ISF0002",
  "message": "Get successfully",
  "payload": {
    "reportTypesName": {
      "id": "cash_flow_statement",
      "name": "Cash Flow Statement-20240420-1"
    },
    "tokenContract": "0x00000000219ab540356cBB839Cbe05303d7705Fa",
    "tokenId": "37002036",
    "reportLink": "505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007"
  }
}
```

- 失敗的回傳

  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "405",
    "message": "Method not allowed",
    "payload": {}
  }
  ```

# listAdmin

- description: This API provides the functionality to get all admins of a company.

## Request

### Request url

```typescript
GET`/company/:companyId/admin`;
```

### Request Example

```typescript
GET`/company/1/admin`;
```

## Response

### Response Parameters

| name    | type    | description                           |
| ------- | ------- | ------------------------------------- |
| powerby | string  | iSunFA v0.1.2+50                      |
| success | boolean | true or false                         |
| code    | string  | response code                         |
| message | string  | description the status of the request |
| payload | Admin[] | admin info                            |

### Admin

| Name      | Type    | Description                   |
| --------- | ------- | ----------------------------- |
| id        | number  | id of admin                   |
| user      | user    | user of admin                 |
| company   | company | company of admin              |
| role      | role    | role of admin                 |
| email     | string  | email of admin                |
| status    | string  | status of admin               |
| startDate | number  | start date of the admin       |
| endDate   | number  | end date of the admin         |
| createAt  | number  | create timestamp of the admin |
| updateAt  | number  | update timestamp of the admin |

### User

| name         | type   | description                         |
| ------------ | ------ | ----------------------------------- |
| id           | string | the unique identifier for the user  |
| name         | string | the user's name                     |
| fullName     | string | the user's full name (optional)     |
| email        | string | the user's email address (optional) |
| phone        | string | the user's phone number (optional)  |
| credentialId | string | the credential ID                   |
| publicKey    | string | the public key                      |
| algorithm    | string | the encryption algorithm used       |
| imageId      | string | avatar of the user                  |

#### Company

| name      | type    | description                     |
| --------- | ------- | ------------------------------- |
| id        | number  | id of company                   |
| name      | string  | name of company                 |
| code      | string  | code of company                 |
| regional  | string  | regional of company             |
| kycStatus | boolean | kyc status of company           |
| imageId   | string  | image id of company             |
| startDate | number  | start date of the company       |
| createdAt | number  | create timestamp of the company |
| updatedAt | number  | update timestamp of the company |

#### Role

| name        | type     | description            |
| ----------- | -------- | ---------------------- |
| id          | string   | role's id              |
| name        | string   | role's name            |
| companyId   | string   | id of the company      |
| companyName | string   | name of the company    |
| permissions | string[] | permission of the role |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.4+46",
  "success": true,
  "code": "200ISF0002",
  "message": "Get successfully",
  "payload": [
    {
      "id": 140,
      "userId": 11,
      "companyId": 24,
      "roleId": 19,
      "email": "test_PUT_INVITATION@test",
      "status": true,
      "startDate": 1717571361,
      "endDate": null,
      "createdAt": 1717571361,
      "updatedAt": 1717571361,
      "user": {
        "id": 11,
        "name": "",
        "fullName": null,
        "email": "test_PUT_INVITATION@test",
        "phone": null,
        "credentialId": "test_PUT_INVITATION",
        "publicKey": "",
        "algorithm": "",
        "imageId": null,
        "createdAt": 1717565772,
        "updatedAt": 1717565772
      },
      "company": {
        "id": 24,
        "name": "Test Company",
        "code": "TST_invitation3",
        "regional": "TW",
        "kycStatus": false,
        "imageId": "imageId",
        "startDate": 1717565772,
        "createdAt": 1717565772,
        "updatedAt": 1717565772
      },
      "role": {
        "id": 19,
        "name": "Test_invitaion",
        "permissions": [],
        "createdAt": 1717565772,
        "updatedAt": 1717565772
      }
    },
    {
      "id": 198,
      "userId": 11,
      "companyId": 24,
      "roleId": 19,
      "email": "test_PUT_INVITATION@test",
      "status": true,
      "startDate": 1717575197,
      "endDate": null,
      "createdAt": 1717575197,
      "updatedAt": 1717575197,
      "user": {
        "id": 11,
        "name": "",
        "fullName": null,
        "email": "test_PUT_INVITATION@test",
        "phone": null,
        "credentialId": "test_PUT_INVITATION",
        "publicKey": "",
        "algorithm": "",
        "imageId": null,
        "createdAt": 1717565772,
        "updatedAt": 1717565772
      },
      "company": {
        "id": 24,
        "name": "Test Company",
        "code": "TST_invitation3",
        "regional": "TW",
        "kycStatus": false,
        "imageId": "imageId",
        "startDate": 1717565772,
        "createdAt": 1717565772,
        "updatedAt": 1717565772
      },
      "role": {
        "id": 19,
        "name": "Test_invitaion",
        "permissions": [],
        "createdAt": 1717565772,
        "updatedAt": 1717565772
      }
    }
  ]
}
```

- 失敗的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "405",
  "message": "Method not allowed",
  "payload": {}
}
```

# getAdminById

- description: This API provides the functionality to get an admin by id.

## Request

### Request url

```typescript
GET`/company/:companyId/admin/:adminId`;
```

### Request Example

```typescript
GET`/company/1/admin/1`;
```

## Param

| name    | type   | description | required | default |
| ------- | ------ | ----------- | -------- | ------- |
| adminId | string | id of admin | yes      | -       |

## Response

### Response Parameters

| name    | type    | description                           |
| ------- | ------- | ------------------------------------- |
| powerby | string  | iSunFA v0.1.2+50                      |
| success | boolean | true or false                         |
| code    | string  | response code                         |
| message | string  | description the status of the request |
| payload | Admin   | admin info                            |

### Admin

| Name      | Type    | Description                   |
| --------- | ------- | ----------------------------- |
| id        | number  | id of admin                   |
| user      | user    | user of admin                 |
| company   | company | company of admin              |
| role      | role    | role of admin                 |
| email     | string  | email of admin                |
| status    | string  | status of admin               |
| startDate | number  | start date of the admin       |
| endDate   | number  | end date of the admin         |
| createAt  | number  | create timestamp of the admin |
| updateAt  | number  | update timestamp of the admin |

### User

| name         | type   | description                         |
| ------------ | ------ | ----------------------------------- |
| id           | string | the unique identifier for the user  |
| name         | string | the user's name                     |
| fullName     | string | the user's full name (optional)     |
| email        | string | the user's email address (optional) |
| phone        | string | the user's phone number (optional)  |
| credentialId | string | the credential ID                   |
| publicKey    | string | the public key                      |
| algorithm    | string | the encryption algorithm used       |
| imageId      | string | avatar of the user                  |

#### Company

| name      | type    | description                     |
| --------- | ------- | ------------------------------- |
| id        | number  | id of company                   |
| name      | string  | name of company                 |
| code      | string  | code of company                 |
| regional  | string  | regional of company             |
| kycStatus | boolean | kyc status of company           |
| imageId   | string  | image id of company             |
| startDate | number  | start date of the company       |
| createdAt | number  | create timestamp of the company |
| updatedAt | number  | update timestamp of the company |

#### Role

| name        | type     | description            |
| ----------- | -------- | ---------------------- |
| id          | string   | role's id              |
| name        | string   | role's name            |
| companyId   | string   | id of the company      |
| companyName | string   | name of the company    |
| permissions | string[] | permission of the role |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.4+46",
  "success": true,
  "code": "200ISF0002",
  "message": "Get successfully",
  "payload": {
    "id": 1,
    "userId": 11,
    "companyId": 24,
    "roleId": 19,
    "email": "test_PUT_INVITATION@test",
    "status": true,
    "startDate": 1717571361,
    "endDate": null,
    "createdAt": 1717571361,
    "updatedAt": 1717571361,
    "user": {
      "id": 11,
      "name": "",
      "fullName": null,
      "email": "test_PUT_INVITATION@test",
      "phone": null,
      "credentialId": "test_PUT_INVITATION",
      "publicKey": "",
      "algorithm": "",
      "imageId": null,
      "createdAt": 1717565772,
      "updatedAt": 1717565772
    },
    "company": {
      "id": 24,
      "name": "Test Company",
      "code": "TST_invitation3",
      "regional": "TW",
      "kycStatus": false,
      "imageId": "imageId",
      "startDate": 1717565772,
      "createdAt": 1717565772,
      "updatedAt": 1717565772
    },
    "role": {
      "id": 19,
      "name": "Test_invitaion",
      "permissions": [],
      "createdAt": 1717565772,
      "updatedAt": 1717565772
    }
  }
}
```

- 失敗的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "405",
  "message": "Method not allowed",
  "payload": {}
}
```

# updateAdminById

- description: This API provides the functionality to update an admin by id.

## Request

### Request url

```typescript
PUT`/company/:companyId/admin/:adminId`;
```

### Request Body

| name   | type    | description  | require | default |
| ------ | ------- | ------------ | ------- | ------- |
| name   | string  | name         | false   | -       |
| status | boolean | admin status | false   | -       |
| role   | string  | role         | false   | -       |

### Request Example

```typescript
PUT / company / 1 / admin / 1;
const body = {
  status: false,
  role: 'admin',
};
```

## Response

### Response Parameters

| name    | type    | description                           |
| ------- | ------- | ------------------------------------- |
| powerby | string  | iSunFA v0.1.2+50                      |
| success | boolean | true or false                         |
| code    | string  | response code                         |
| message | string  | description the status of the request |
| payload | Admin   | admin info                            |

### Admin

| Name      | Type    | Description                   |
| --------- | ------- | ----------------------------- |
| id        | number  | id of admin                   |
| user      | user    | user of admin                 |
| company   | company | company of admin              |
| role      | role    | role of admin                 |
| email     | string  | email of admin                |
| status    | string  | status of admin               |
| startDate | number  | start date of the admin       |
| endDate   | number  | end date of the admin         |
| createAt  | number  | create timestamp of the admin |
| updateAt  | number  | update timestamp of the admin |

### User

| name         | type   | description                         |
| ------------ | ------ | ----------------------------------- |
| id           | string | the unique identifier for the user  |
| name         | string | the user's name                     |
| fullName     | string | the user's full name (optional)     |
| email        | string | the user's email address (optional) |
| phone        | string | the user's phone number (optional)  |
| credentialId | string | the credential ID                   |
| publicKey    | string | the public key                      |
| algorithm    | string | the encryption algorithm used       |
| imageId      | string | avatar of the user                  |

#### Company

| name      | type    | description                     |
| --------- | ------- | ------------------------------- |
| id        | number  | id of company                   |
| name      | string  | name of company                 |
| code      | string  | code of company                 |
| regional  | string  | regional of company             |
| kycStatus | boolean | kyc status of company           |
| imageId   | string  | image id of company             |
| startDate | number  | start date of the company       |
| createdAt | number  | create timestamp of the company |
| updatedAt | number  | update timestamp of the company |

#### Role

| name        | type     | description            |
| ----------- | -------- | ---------------------- |
| id          | string   | role's id              |
| name        | string   | role's name            |
| companyId   | string   | id of the company      |
| companyName | string   | name of the company    |
| permissions | string[] | permission of the role |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": true,
  "code": "200",
  "message": "Success",
  "payload": {
    "id": 1,
    "userId": 11,
    "companyId": 24,
    "roleId": 19,
    "email": "test_PUT_INVITATION@test",
    "status": false,
    "startDate": 1717571361,
    "endDate": null,
    "createdAt": 1717571361,
    "updatedAt": 1717571361,
    "user": {
      "id": 11,
      "name": "",
      "fullName": null,
      "email": "test_PUT_INVITATION@test",
      "phone": null,
      "credentialId": "test_PUT_INVITATION",
      "publicKey": "",
      "algorithm": "",
      "imageId": null,
      "createdAt": 1717565772,
      "updatedAt": 1717565772
    },
    "company": {
      "id": 24,
      "name": "Test Company",
      "code": "TST_invitation3",
      "regional": "TW",
      "kycStatus": false,
      "imageId": "imageId",
      "startDate": 1717565772,
      "createdAt": 1717565772,
      "updatedAt": 1717565772
    },
    "role": {
      "id": 19,
      "name": "admin",
      "permissions": [],
      "createdAt": 1717565772,
      "updatedAt": 1717565772
    }
  }
}
```

- 失敗的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "422",
  "message": "Invalid input parameter",
  "payload": {}
}
```

# transferOwner

- description: This API provides the functionality to transfer the ownership of a company to another
  admin.

## Request

### Request url

```typescript
PUT`/company/:companyId/transfer_owner`;
```

### Request Body

| name       | type   | description | require | default |
| ---------- | ------ | ----------- | ------- | ------- |
| newOwnerId | string | newOwnerId  | true    | -       |

### Request Example

```typescript
PUT / company / 1 / transfer_owner;
const body = {
  newOwnerId: '1',
};
```

## Response

### Response Parameters

| name    | type    | description                           |
| ------- | ------- | ------------------------------------- |
| powerby | string  | iSunFA v0.1.2+50                      |
| success | boolean | true or false                         |
| code    | string  | response code                         |
| message | string  | description the status of the request |
| payload | Admin[] | updated admin info                    |

#### Admin

| Name      | Type    | Description                   |
| --------- | ------- | ----------------------------- |
| id        | number  | id of admin                   |
| user      | user    | user of admin                 |
| company   | company | company of admin              |
| role      | role    | role of admin                 |
| email     | string  | email of admin                |
| status    | string  | status of admin               |
| startDate | number  | start date of the admin       |
| endDate   | number  | end date of the admin         |
| createAt  | number  | create timestamp of the admin |
| updateAt  | number  | update timestamp of the admin |

#### User

| name         | type   | description                         |
| ------------ | ------ | ----------------------------------- |
| id           | string | the unique identifier for the user  |
| name         | string | the user's name                     |
| fullName     | string | the user's full name (optional)     |
| email        | string | the user's email address (optional) |
| phone        | string | the user's phone number (optional)  |
| credentialId | string | the credential ID                   |
| publicKey    | string | the public key                      |
| algorithm    | string | the encryption algorithm used       |
| imageId      | string | avatar of the user                  |

#### Company

| name      | type    | description                     |
| --------- | ------- | ------------------------------- |
| id        | number  | id of company                   |
| name      | string  | name of company                 |
| code      | string  | code of company                 |
| regional  | string  | regional of company             |
| kycStatus | boolean | kyc status of company           |
| imageId   | string  | image id of company             |
| startDate | number  | start date of the company       |
| createdAt | number  | create timestamp of the company |
| updatedAt | number  | update timestamp of the company |

#### Role

| name        | type     | description            |
| ----------- | -------- | ---------------------- |
| id          | string   | role's id              |
| name        | string   | role's name            |
| companyId   | string   | id of the company      |
| companyName | string   | name of the company    |
| permissions | string[] | permission of the role |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": true,
  "code": "200",
  "message": "Success",
  "payload": {
    "id": 1,
    "userId": 11,
    "companyId": 24,
    "roleId": 19,
    "email": "test_PUT_INVITATION@test",
    "status": false,
    "startDate": 1717571361,
    "endDate": null,
    "createdAt": 1717571361,
    "updatedAt": 1717571361,
    "user": {
      "id": 11,
      "name": "",
      "fullName": null,
      "email": "test_PUT_INVITATION@test",
      "phone": null,
      "credentialId": "test_PUT_INVITATION",
      "publicKey": "",
      "algorithm": "",
      "imageId": null,
      "createdAt": 1717565772,
      "updatedAt": 1717565772
    },
    "company": {
      "id": 24,
      "name": "Test Company",
      "code": "TST_invitation3",
      "regional": "TW",
      "kycStatus": false,
      "imageId": "imageId",
      "startDate": 1717565772,
      "createdAt": 1717565772,
      "updatedAt": 1717565772
    },
    "role": {
      "id": 19,
      "name": "admin",
      "permissions": [],
      "createdAt": 1717565772,
      "updatedAt": 1717565772
    }
  }
}
```

- 失敗的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "422",
  "message": "Invalid input parameter",
  "payload": {}
}
```

# deleteAdminById

- description: This API provides the functionality to delete an admin by id.

## Request

### Request url

```typescript
DELETE`/company/:companyId/admin/:adminId`;
```

### Request Example

```typescript
DELETE`/company/1/admin/1`;
```

## Response

### Response Parameters

| name    | type    | description                           |
| ------- | ------- | ------------------------------------- |
| powerby | string  | iSunFA v0.1.2+50                      |
| success | boolean | true or false                         |
| code    | string  | response code                         |
| message | string  | description the status of the request |
| payload | Admin   | admin info                            |

#### Admin

| Name      | Type    | Description                   |
| --------- | ------- | ----------------------------- |
| id        | number  | id of admin                   |
| user      | user    | user of admin                 |
| company   | company | company of admin              |
| role      | role    | role of admin                 |
| email     | string  | email of admin                |
| status    | string  | status of admin               |
| startDate | number  | start date of the admin       |
| endDate   | number  | end date of the admin         |
| createAt  | number  | create timestamp of the admin |
| updateAt  | number  | update timestamp of the admin |

#### User

| name         | type   | description                         |
| ------------ | ------ | ----------------------------------- |
| id           | string | the unique identifier for the user  |
| name         | string | the user's name                     |
| fullName     | string | the user's full name (optional)     |
| email        | string | the user's email address (optional) |
| phone        | string | the user's phone number (optional)  |
| credentialId | string | the credential ID                   |
| publicKey    | string | the public key                      |
| algorithm    | string | the encryption algorithm used       |
| imageId      | string | avatar of the user                  |

#### Company

| name      | type    | description                     |
| --------- | ------- | ------------------------------- |
| id        | number  | id of company                   |
| name      | string  | name of company                 |
| code      | string  | code of company                 |
| regional  | string  | regional of company             |
| kycStatus | boolean | kyc status of company           |
| imageId   | string  | image id of company             |
| startDate | number  | start date of the company       |
| createdAt | number  | create timestamp of the company |
| updatedAt | number  | update timestamp of the company |

#### Role

| name        | type     | description            |
| ----------- | -------- | ---------------------- |
| id          | string   | role's id              |
| name        | string   | role's name            |
| companyId   | string   | id of the company      |
| companyName | string   | name of the company    |
| permissions | string[] | permission of the role |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": true,
  "code": "200",
  "message": "Success",
  "payload": {
    "id": 1,
    "userId": 11,
    "companyId": 24,
    "roleId": 19,
    "email": "test_PUT_INVITATION@test",
    "status": false,
    "startDate": 1717571361,
    "endDate": null,
    "createdAt": 1717571361,
    "updatedAt": 1717571361,
    "user": {
      "id": 11,
      "name": "",
      "fullName": null,
      "email": "test_PUT_INVITATION@test",
      "phone": null,
      "credentialId": "test_PUT_INVITATION",
      "publicKey": "",
      "algorithm": "",
      "imageId": null,
      "createdAt": 1717565772,
      "updatedAt": 1717565772
    },
    "company": {
      "id": 24,
      "name": "Test Company",
      "code": "TST_invitation3",
      "regional": "TW",
      "kycStatus": false,
      "imageId": "imageId",
      "startDate": 1717565772,
      "createdAt": 1717565772,
      "updatedAt": 1717565772
    },
    "role": {
      "id": 19,
      "name": "admin",
      "permissions": [],
      "createdAt": 1717565772,
      "updatedAt": 1717565772
    }
  }
}
```

- 失敗的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "422",
  "message": "Invalid input parameter",
  "payload": {}
}
```

# getChallenge

- description: This API provides the functionality to get a challenge which format is base64URL.

## Request

### Request url

```typescript
GET`/challenge`;
```

### Request Example

```typescript
GET`/challenge`;
```

## Response

### Response Parameters

| name    | type    | description                           |
| ------- | ------- | ------------------------------------- |
| powerby | string  | iSunFA v0.1.2+50                      |
| success | boolean | true or false                         |
| code    | string  | response code                         |
| message | string  | description the status of the request |
| payload | string  | challenge                             |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": true,
  "code": "200",
  "message": "Success",
  "payload": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2MzQwNzQwNzAsImV4cCI6MTYzNDA3NDA3MX0"
}
```

- 失敗的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "422",
  "message": "Invalid input parameter",
  "payload": ""
}
```

# getAllSalaryRecords

- description: This API provides the functionality to get all salary records.

## Request

### Request url

```typescript
GET`/company/:companyId/salary`;
```

### Query

| name      | type   | description                | required | default |
| --------- | ------ | -------------------------- | -------- | ------- |
| companyId | number | specific id of the company | yes      | -       |

### Request Example

```typescript
GET`/company/1/salary`;
```

## Response

### Response Parameters

| name    | type                                   | description                  |
| ------- | -------------------------------------- | ---------------------------- |
| powerby | string                                 | iSunFA v0.1.2+50             |
| success | boolean                                | true or false                |
| code    | string                                 | response code                |
| message | string                                 | description of response data |
| payload | ISalaryRecord[] \| ISalaryRecord \| {} | response data                |

### ISalaryRecord

| name               | type    | description                                        |
| ------------------ | ------- | -------------------------------------------------- |
| id                 | number  | unique number of the salary record                 |
| employeeId         | number  | unique number of the employee                      |
| employeeName       | string  | employee name                                      |
| employeeDepartment | string  | employee department                                |
| salary             | number  | employee salary                                    |
| insurancePayment   | number  | insurance paid by the company(健保+勞保+勞退)      |
| bonus              | number  | employee bonus                                     |
| description        | string  | description of the salary record                   |
| startDate          | number  | start duration of the salary record                |
| endDate            | number  | end duration of the salary record                  |
| workingHour        | number  | working hours in the duration of the salary record |
| confirmed          | boolean | if the salary record is confirmed                  |
| createdAt          | number  | creation timestamp of the salary record            |
| updatedAt          | number  | update timestamp of the salary record              |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.8+52",
  "success": true,
  "code": "200ISF0001",
  "message": "List successfully",
  "payload": [
    {
      "id": 10000000,
      "employeeId": 10000000,
      "employeeName": "aook",
      "employeeDepartment": "Engineering",
      "salary": 6000,
      "insurancePayment": 250,
      "bonus": 0,
      "description": "June Salary",
      "startDate": 1717527265,
      "endDate": 1720119265,
      "workingHour": 184,
      "confirmed": false,
      "createdAt": 1721115051,
      "updatedAt": 1721115051
    },
    {
      "id": 10000001,
      "employeeId": 10000001,
      "employeeName": "book",
      "employeeDepartment": "Engineering",
      "salary": 5000,
      "insurancePayment": 200,
      "bonus": 0,
      "description": "June Salary",
      "startDate": 1717527265,
      "endDate": 1720119265,
      "workingHour": 184,
      "confirmed": false,
      "createdAt": 1721115051,
      "updatedAt": 1721115051
    },
    {
      "id": 10000002,
      "employeeId": 10000002,
      "employeeName": "cook",
      "employeeDepartment": "Engineering",
      "salary": 4000,
      "insurancePayment": 150,
      "bonus": 0,
      "description": "June Salary",
      "startDate": 1717527265,
      "endDate": 1720119265,
      "workingHour": 184,
      "confirmed": false,
      "createdAt": 1721115051,
      "updatedAt": 1721115051
    }
  ]
}
```

- 失敗的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "400",
    "message": "bad request",
    "payload": {}
  }
  ```

# createSalaryRecords

- description: This API provides the functionality to post many salary records.

## Request

### Request url

```typescript
POST`/company/:companyId/salary`;
```

### Query

| name      | type   | description                | required | default |
| --------- | ------ | -------------------------- | -------- | ------- |
| companyId | number | specific id of the company | yes      | -       |

### Body

| name           | type     | description                                        |
| -------------- | -------- | -------------------------------------------------- |
| type           | string   | type of the salary record("Salary" / "Bonus")      |
| frequency      | string   | frequency of the payment("Month" / "Year" / "Day") |
| startDate      | number   | start timestamp of the salary record period        |
| endDate        | number   | end timestamp of the salary record period          |
| employeeIdList | number[] | list of employee IDs                               |
| description    | string   | description of salary records                      |

### Request Example

```typescript
POST`/company/1/salary`;
```

- Body

```json
{
  "type": "Salary",
  "frequency": "Month",
  "startDate": 1717527265,
  "endDate": 1720119265,
  "employeeIdList": [10000000, 10000001, 10000002],
  "description": "June Salary"
}
```

## Response

### Response Parameters

| name    | type                                   | description                  |
| ------- | -------------------------------------- | ---------------------------- |
| powerby | string                                 | iSunFA v0.1.2+50             |
| success | boolean                                | true or false                |
| code    | string                                 | response code                |
| message | string                                 | description of response data |
| payload | ISalaryRecord[] \| ISalaryRecord \| {} | response data                |

### ISalaryRecord

| name               | type    | description                                        |
| ------------------ | ------- | -------------------------------------------------- |
| id                 | number  | unique number of the salary record                 |
| employeeId         | number  | unique number of the employee                      |
| employeeName       | string  | employee name                                      |
| employeeDepartment | string  | employee department                                |
| salary             | number  | employee salary                                    |
| insurancePayment   | number  | insurance paid by the company(健保+勞保+勞退)      |
| bonus              | number  | employee bonus                                     |
| description        | string  | description of the salary record                   |
| startDate          | number  | start duration of the salary record                |
| endDate            | number  | end duration of the salary record                  |
| workingHour        | number  | working hours in the duration of the salary record |
| confirmed          | boolean | if the salary record is confirmed                  |
| createdAt          | number  | creation timestamp of the salary record            |
| updatedAt          | number  | update timestamp of the salary record              |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.8+52",
  "success": true,
  "code": "201ISF0000",
  "message": "Created successfully",
  "payload": [
    {
      "id": 10000003,
      "employeeId": 10000000,
      "employeeName": "aook",
      "employeeDepartment": "Engineering",
      "salary": 200000,
      "insurancePayment": 1000,
      "bonus": 0,
      "description": "June Salary",
      "startDate": 1717527265,
      "endDate": 1720119265,
      "workingHour": 184,
      "confirmed": false,
      "createdAt": 1721635489,
      "updatedAt": 1721635489
    },
    {
      "id": 10000004,
      "employeeId": 10000001,
      "employeeName": "book",
      "employeeDepartment": "Engineering",
      "salary": 5000,
      "insurancePayment": 200,
      "bonus": 0,
      "description": "June Salary",
      "startDate": 1717527265,
      "endDate": 1720119265,
      "workingHour": 184,
      "confirmed": false,
      "createdAt": 1721635489,
      "updatedAt": 1721635489
    },
    {
      "id": 10000005,
      "employeeId": 10000002,
      "employeeName": "cook",
      "employeeDepartment": "Engineering",
      "salary": 4000,
      "insurancePayment": 150,
      "bonus": 0,
      "description": "June Salary",
      "startDate": 1717527265,
      "endDate": 1720119265,
      "workingHour": 184,
      "confirmed": false,
      "createdAt": 1721635489,
      "updatedAt": 1721635489
    }
  ]
}
```

- 失敗的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "400",
    "message": "bad request",
    "payload": {}
  }
  ```

# updateSalaryRecords

- description: This API provides the functionality to update unconfirmed salary records.

## Request

### Request url

```typescript
PUT`/company/:companyId/salary`;
```

### Query

| name      | type   | description                | required | default |
| --------- | ------ | -------------------------- | -------- | ------- |
| companyId | number | specific id of the company | yes      | -       |

### Request Example

```typescript
PUT`/company/1/salary`;
```

## Response

### Response Parameters

| name    | type                                   | description                  |
| ------- | -------------------------------------- | ---------------------------- |
| powerby | string                                 | iSunFA v0.1.2+50             |
| success | boolean                                | true or false                |
| code    | string                                 | response code                |
| message | string                                 | description of response data |
| payload | ISalaryRecord[] \| ISalaryRecord \| {} | response data                |

### ISalaryRecord

| name               | type    | description                                        |
| ------------------ | ------- | -------------------------------------------------- |
| id                 | number  | unique number of the salary record                 |
| employeeId         | number  | unique number of the employee                      |
| employeeName       | string  | employee name                                      |
| employeeDepartment | string  | employee department                                |
| salary             | number  | employee salary                                    |
| insurancePayment   | number  | insurance paid by the company(健保+勞保+勞退)      |
| bonus              | number  | employee bonus                                     |
| description        | string  | description of the salary record                   |
| startDate          | number  | start duration of the salary record                |
| endDate            | number  | end duration of the salary record                  |
| workingHour        | number  | working hours in the duration of the salary record |
| confirmed          | boolean | if the salary record is confirmed                  |
| createdAt          | number  | creation timestamp of the salary record            |
| updatedAt          | number  | update timestamp of the salary record              |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.8+52",
  "success": true,
  "code": "200ISF0003",
  "message": "Update successfully",
  "payload": [
    {
      "id": 10000000,
      "employeeId": 10000000,
      "employeeName": "aook",
      "employeeDepartment": "Engineering",
      "salary": 6000,
      "insurancePayment": 250,
      "bonus": 0,
      "description": "June Salary",
      "startDate": 1717527265,
      "endDate": 1720119265,
      "workingHour": 184,
      "confirmed": true,
      "createdAt": 1721115051,
      "updatedAt": 1721635854
    },
    {
      "id": 10000001,
      "employeeId": 10000001,
      "employeeName": "book",
      "employeeDepartment": "Engineering",
      "salary": 5000,
      "insurancePayment": 200,
      "bonus": 0,
      "description": "June Salary",
      "startDate": 1717527265,
      "endDate": 1720119265,
      "workingHour": 184,
      "confirmed": true,
      "createdAt": 1721115051,
      "updatedAt": 1721635854
    },
    {
      "id": 10000002,
      "employeeId": 10000002,
      "employeeName": "cook",
      "employeeDepartment": "Engineering",
      "salary": 4000,
      "insurancePayment": 150,
      "bonus": 0,
      "description": "June Salary",
      "startDate": 1717527265,
      "endDate": 1720119265,
      "workingHour": 184,
      "confirmed": true,
      "createdAt": 1721115051,
      "updatedAt": 1721635854
    },
    {
      "id": 10000003,
      "employeeId": 10000000,
      "employeeName": "aook",
      "employeeDepartment": "Engineering",
      "salary": 200000,
      "insurancePayment": 1000,
      "bonus": 0,
      "description": "June Salary",
      "startDate": 1717527265,
      "endDate": 1720119265,
      "workingHour": 184,
      "confirmed": true,
      "createdAt": 1721635489,
      "updatedAt": 1721635854
    },
    {
      "id": 10000004,
      "employeeId": 10000001,
      "employeeName": "book",
      "employeeDepartment": "Engineering",
      "salary": 5000,
      "insurancePayment": 200,
      "bonus": 0,
      "description": "June Salary",
      "startDate": 1717527265,
      "endDate": 1720119265,
      "workingHour": 184,
      "confirmed": true,
      "createdAt": 1721635489,
      "updatedAt": 1721635854
    },
    {
      "id": 10000005,
      "employeeId": 10000002,
      "employeeName": "cook",
      "employeeDepartment": "Engineering",
      "salary": 4000,
      "insurancePayment": 150,
      "bonus": 0,
      "description": "June Salary",
      "startDate": 1717527265,
      "endDate": 1720119265,
      "workingHour": 184,
      "confirmed": true,
      "createdAt": 1721635489,
      "updatedAt": 1721635854
    }
  ]
}
```

- 失敗的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "400",
    "message": "bad request",
    "payload": {}
  }
  ```

# getASalaryRecord

- description: This API provides the functionality to get a salary record.

## Request

### Request url

```typescript
GET`/company/:companyId/salary/:salaryId`;
```

### Query

| name      | type   | description                      | required | default |
| --------- | ------ | -------------------------------- | -------- | ------- |
| companyId | number | specific id of the company       | yes      | -       |
| salaryId  | number | specific id of the salary record | yes      | -       |

### Request Example

```typescript
GET`/company/1/salary/1`;
```

## Response

### Response Parameters

| name    | type                            | description                  |
| ------- | ------------------------------- | ---------------------------- |
| powerby | string                          | iSunFA v0.1.2+50             |
| success | boolean                         | true or false                |
| code    | string                          | response code                |
| message | string                          | description of response data |
| payload | ISalaryRecordWithProjects \| {} | response data                |

### ISalaryRecordWithProjects

| name               | type                           | description                                        |
| ------------------ | ------------------------------ | -------------------------------------------------- |
| id                 | number                         | unique number of the salary record                 |
| employeeId         | number                         | unique number of the employee                      |
| employeeName       | string                         | employee name                                      |
| employeeDepartment | string                         | employee department                                |
| salary             | number                         | employee salary                                    |
| insurancePayment   | number                         | insurance paid by the company(健保+勞保+勞退)      |
| bonus              | number                         | employee bonus                                     |
| description        | string                         | description of the salary record                   |
| startDate          | number                         | start duration of the salary record                |
| endDate            | number                         | end duration of the salary record                  |
| workingHour        | number                         | working hours in the duration of the salary record |
| confirmed          | boolean                        | if the salary record is confirmed                  |
| createdAt          | number                         | creation timestamp of the salary record            |
| updatedAt          | number                         | update timestamp of the salary record              |
| projects           | { id: number; name: string }[] | involved projects of the salary record             |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.8+52",
  "success": true,
  "code": "200ISF0002",
  "message": "Get successfully",
  "payload": {
    "id": 10000003,
    "employeeId": 10000000,
    "employeeName": "aook",
    "employeeDepartment": "Engineering",
    "salary": 200000,
    "insurancePayment": 1000,
    "bonus": 0,
    "description": "June Salary",
    "startDate": 1717527265,
    "endDate": 1720119265,
    "workingHour": 184,
    "confirmed": true,
    "createdAt": 1721635489,
    "updatedAt": 1721635854,
    "projects": [
      {
        "id": 9999991,
        "name": "iSunFA"
      }
    ]
  }
}
```

- 失敗的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "400",
    "message": "bad request",
    "payload": {}
  }
  ```

# updateASalaryRecord

- description: This API provides the functionality to update a salary record.

## Request

### Request url

```typescript
PUT`/company/:companyId/salary/:salaryId`;
```

### Query

| name      | type   | description                      | required | default |
| --------- | ------ | -------------------------------- | -------- | ------- |
| companyId | number | specific id of the company       | yes      | -       |
| salaryId  | number | specific id of the salary record | yes      | -       |

### Body

| name             | type                                          | description                                        |
| ---------------- | --------------------------------------------- | -------------------------------------------------- |
| department       | string                                        | department of the employee                         |
| name             | string                                        | name of the employee                               |
| salary           | number                                        | salary of the employee                             |
| bonus            | number                                        | bonus of the employee                              |
| insurancePayment | number                                        | insurance paid by the company(健保+勞保+勞退)      |
| description      | string                                        | description of the salary record                   |
| projects         | { id: number; name: string; hours: number }[] | involved projects info of the salary record        |
| startDate        | number                                        | start duration of the salary record                |
| endDate          | number                                        | end duration of the salary record                  |
| workingHours     | number                                        | working hours in the duration of the salary record |

### Request Example

```typescript
PUT`/company/1/salary/1`;
```

- Body

```json
{
  "name": "book",
  "department": "Engineering",
  "salary": 5000,
  "insurancePayment": 200,
  "bonus": 0,
  "description": "June Salary",
  "startDate": 1717527265,
  "endDate": 1720119265,
  "workingHours": 184,
  "projects": [
    {
      "id": 9999991,
      "name": "iSunFA",
      "hours": 80
    },
    {
      "id": 9999992,
      "name": "BAIFA",
      "hours": 70
    }
  ]
}
```

## Response

### Response Parameters

| name    | type                                    | description                  |
| ------- | --------------------------------------- | ---------------------------- |
| powerby | string                                  | iSunFA v0.1.2+50             |
| success | boolean                                 | true or false                |
| code    | string                                  | response code                |
| message | string                                  | description of response data |
| payload | ISalaryRecordWithProjectsAndHours \| {} | response data                |

### ISalaryRecordWithProjectsAndHours

| name               | type                                          | description                                        |
| ------------------ | --------------------------------------------- | -------------------------------------------------- |
| id                 | number                                        | unique number of the salary record                 |
| employeeId         | number                                        | unique number of the employee                      |
| employeeName       | string                                        | employee name                                      |
| employeeDepartment | string                                        | employee department                                |
| salary             | number                                        | employee salary                                    |
| insurancePayment   | number                                        | insurance paid by the company(健保+勞保+勞退)      |
| bonus              | number                                        | employee bonus                                     |
| description        | string                                        | description of the salary record                   |
| startDate          | number                                        | start duration of the salary record                |
| endDate            | number                                        | end duration of the salary record                  |
| workingHour        | number                                        | working hours in the duration of the salary record |
| confirmed          | boolean                                       | if the salary record is confirmed                  |
| createdAt          | number                                        | creation timestamp of the salary record            |
| updatedAt          | number                                        | update timestamp of the salary record              |
| projects           | { id: number; name: string; hours: number }[] | involved projects of the salary record             |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.8+52",
  "success": true,
  "code": "200ISF0003",
  "message": "Update successfully",
  "payload": {
    "id": 10000004,
    "employeeId": 10000001,
    "employeeName": "book",
    "employeeDepartment": "Engineering",
    "salary": 5000,
    "insurancePayment": 200,
    "bonus": 0,
    "description": "June Salary",
    "startDate": 1717527265,
    "endDate": 1720119265,
    "workingHour": 184,
    "confirmed": true,
    "createdAt": 1721635489,
    "updatedAt": 1721637905,
    "projects": [
      {
        "id": 9999991,
        "name": "iSunFA",
        "hours": 80
      },
      {
        "id": 9999992,
        "name": "BAIFA",
        "hours": 70
      }
    ]
  }
}
```

- 失敗的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "400",
    "message": "bad request",
    "payload": {}
  }
  ```

# createASalaryVoucher

- description: This API provides the functionality to post a voucher for salary records.

## Request

### Request url

```typescript
POST`/company/:companyId/salary/voucher`;
```

### Query

| name      | type   | description                | required | default |
| --------- | ------ | -------------------------- | -------- | ------- |
| companyId | number | specific id of the company | yes      | -       |

### Body

| name                 | type     | description                      |
| -------------------- | -------- | -------------------------------- |
| salaryRecordsIdsList | number[] | array of IDs of salary records   |
| voucherType          | string   | voucher type("Salary" / "Bonus") |

### Request Example

```typescript
POST`/company/1/salary/voucher`;
```

- Body

```json
{
  "salaryRecordsIdsList": [10000000, 10000001, 10000002],
  "voucherType": "Salary"
}
```

## Response

### Response Parameters

| name    | type                | description                  |
| ------- | ------------------- | ---------------------------- |
| powerby | string              | iSunFA v0.1.2+50             |
| success | boolean             | true or false                |
| code    | string              | response code                |
| message | string              | description of response data |
| payload | voucherFolder \| {} | response data                |

### voucherFolder

| name      | type   | description                      |
| --------- | ------ | -------------------------------- |
| id        | number | unique number of the folder      |
| name      | string | folder name                      |
| createdAt | number | creation timestamp of the folder |
| updatedAt | number | update timestamp of the folder   |
| companyId | number | unique number of the company     |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.8+52",
  "success": true,
  "code": "201ISF0000",
  "message": "Created successfully",
  "payload": {
    "id": 10000001,
    "name": "Salary Voucher: 20240722001",
    "createdAt": 1721638861,
    "updatedAt": 1721638861,
    "companyId": 10000000
  }
}
```

- 失敗的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "400",
    "message": "bad request",
    "payload": {}
  }
  ```

# getAllSalaryVoucherFolders

- description: This API provides the functionality to get all salary voucher folders.

## Request

### Request url

```typescript
GET`/company/:companyId/salary/folder`;
```

### Query

| name      | type   | description                | required | default |
| --------- | ------ | -------------------------- | -------- | ------- |
| companyId | number | specific id of the company | yes      | -       |

### Request Example

```typescript
GET`/company/1/salary/folder`;
```

## Response

### Response Parameters

| name    | type                       | description                  |
| ------- | -------------------------- | ---------------------------- |
| powerby | string                     | iSunFA v0.1.2+50             |
| success | boolean                    | true or false                |
| code    | string                     | response code                |
| message | string                     | description of response data |
| payload | IFolder[] \| IFolder \| {} | response data                |

### IFolder

| name      | type   | description                      |
| --------- | ------ | -------------------------------- |
| id        | number | unique number of the folder      |
| name      | string | folder name                      |
| createdAt | number | creation timestamp of the folder |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.8+52",
  "success": true,
  "code": "200ISF0001",
  "message": "List successfully",
  "payload": [
    {
      "id": 10000000,
      "name": "薪資傳票六月",
      "createdAt": 1721115205
    },
    {
      "id": 10000001,
      "name": "Salary Voucher: 20240722001",
      "createdAt": 1721638861
    }
  ]
}
```

- 失敗的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "400",
    "message": "bad request",
    "payload": {}
  }
  ```

# getASalaryVoucherFolder

- description: This API provides the functionality to get a salary voucher folder with voucher and
  salary records.

## Request

### Request url

```typescript
GET`/company/:companyId/salary/folder/:folderId`;
```

### Query

| name      | type   | description                | required | default |
| --------- | ------ | -------------------------- | -------- | ------- |
| companyId | number | specific id of the company | yes      | -       |
| folderId  | number | specific id of the folder  | yes      | -       |

### Request Example

```typescript
GET`/company/10000000/salary/folder/10000000`;
```

## Response

### Response Parameters

| name    | type                 | description                  |
| ------- | -------------------- | ---------------------------- |
| powerby | string               | iSunFA v0.1.2+50             |
| success | boolean              | true or false                |
| code    | string               | response code                |
| message | string               | description of response data |
| payload | IFolderContent \| {} | response data                |

### IFolderContent

| name             | type             | description                             |
| ---------------- | ---------------- | --------------------------------------- |
| id               | number           | unique number of the folder             |
| name             | string           | folder name                             |
| createdAt        | number           | creation timestamp of the folder        |
| voucher          | IJournalListItem | the voucher info                        |
| salaryRecordList | ISalaryRecord[]  | array of salary records for the voucher |

### IJournalListItem

| name        | type                                                              | description                                                                                                                       |
| ----------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| id          | number                                                            | unique id of the voucher                                                                                                          |
| date        | number                                                            | creation timestamp of the voucher                                                                                                 |
| type        | string                                                            | type of the voucher("Payment")                                                                                                    |
| particulars | string                                                            | details of the voucher("Salary Bookkeeping")                                                                                      |
| fromTo      | string                                                            | source or destination of the voucher("Employees")                                                                                 |
| account     | { id: number; debit: boolean; account: string; amount: number }[] | list of account details(id: accounting account code, debit: if it's a debit accounting account, account: accounting account name) |
| voucherId   | number                                                            | unique id of the voucher                                                                                                          |
| voucherNo   | string                                                            | number of the voucher                                                                                                             |

### ISalaryRecord

| name               | type    | description                                        |
| ------------------ | ------- | -------------------------------------------------- |
| id                 | number  | unique number of the salary record                 |
| employeeId         | number  | unique number of the employee                      |
| employeeName       | string  | employee name                                      |
| employeeDepartment | string  | employee department                                |
| salary             | number  | employee salary                                    |
| insurancePayment   | number  | insurance paid by the company(健保+勞保+勞退)      |
| bonus              | number  | employee bonus                                     |
| description        | string  | description of the salary record                   |
| startDate          | number  | start duration of the salary record                |
| endDate            | number  | end duration of the salary record                  |
| workingHour        | number  | working hours in the duration of the salary record |
| confirmed          | boolean | if the salary record is confirmed                  |
| createdAt          | number  | creation timestamp of the salary record            |
| updatedAt          | number  | update timestamp of the salary record              |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.8+52",
  "success": true,
  "code": "200ISF0002",
  "message": "Get successfully",
  "payload": {
    "id": 10000000,
    "name": "薪資傳票七月",
    "createdAt": 1721115205,
    "voucher": {
      "id": 10000000,
      "date": 1721115205,
      "type": "Payment",
      "particulars": "Salary Bookkeeping",
      "fromTo": "Employees",
      "account": [
        {
          "id": 2201,
          "debit": false,
          "account": "應付薪資",
          "amount": 15600
        },
        {
          "id": 6110,
          "debit": true,
          "account": "薪資支出",
          "amount": 15600
        }
      ],
      "voucherId": 10000000,
      "voucherNo": "20240716001"
    },
    "salaryRecordList": [
      {
        "id": 10000001,
        "employeeId": 10000001,
        "employeeName": "book",
        "employeeDepartment": "Engineering",
        "salary": 5000,
        "insurancePayment": 200,
        "bonus": 0,
        "description": "June Salary",
        "startDate": 1717527265,
        "endDate": 1720119265,
        "workingHour": 184,
        "confirmed": true,
        "createdAt": 1721115051,
        "updatedAt": 1721635854
      },
      {
        "id": 10000000,
        "employeeId": 10000000,
        "employeeName": "aook",
        "employeeDepartment": "Engineering",
        "salary": 6000,
        "insurancePayment": 250,
        "bonus": 0,
        "description": "June Salary",
        "startDate": 1717527265,
        "endDate": 1720119265,
        "workingHour": 184,
        "confirmed": true,
        "createdAt": 1721115051,
        "updatedAt": 1721635854
      },
      {
        "id": 10000002,
        "employeeId": 10000002,
        "employeeName": "cook",
        "employeeDepartment": "Engineering",
        "salary": 4000,
        "insurancePayment": 150,
        "bonus": 0,
        "description": "June Salary",
        "startDate": 1717527265,
        "endDate": 1720119265,
        "workingHour": 184,
        "confirmed": true,
        "createdAt": 1721115051,
        "updatedAt": 1721635854
      }
    ]
  }
}
```

- 失敗的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "400",
    "message": "bad request",
    "payload": {}
  }
  ```

# updateASalaryVoucherFolder

- description: This API provides the functionality to update a name of a salary voucher folder.

## Request

### Request url

```typescript
PUT`/company/:companyId/salary/folder/:folderId`;
```

### Query

| name      | type   | description                | required | default |
| --------- | ------ | -------------------------- | -------- | ------- |
| companyId | number | specific id of the company | yes      | -       |
| folderId  | number | specific id of the folder  | yes      | -       |

### Body

| name | type   | description        |
| ---- | ------ | ------------------ |
| name | string | name of the folder |

### Request Example

```typescript
PUT`/company/10000000/salary/folder/10000000`;
```

- Body

```json
{
  "name": "薪資傳票七月"
}
```

## Response

### Response Parameters

| name    | type          | description                  |
| ------- | ------------- | ---------------------------- |
| powerby | string        | iSunFA v0.1.2+50             |
| success | boolean       | true or false                |
| code    | string        | response code                |
| message | string        | description of response data |
| payload | IFolder \| {} | response data                |

### IFolder

| name      | type   | description                      |
| --------- | ------ | -------------------------------- |
| id        | number | unique number of the folder      |
| name      | string | folder name                      |
| createdAt | number | creation timestamp of the folder |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.8+52",
  "success": true,
  "code": "200ISF0003",
  "message": "Update successfully",
  "payload": {
    "id": 10000000,
    "name": "薪資傳票七月",
    "createdAt": 1721115205
  }
}
```

- 失敗的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "400",
    "message": "bad request",
    "payload": {}
  }
  ```

# deleteAJournalById

- description: This API provides the functionality to delete a journal by id through updating delete
  time for related payment, invoice, lineItem, voucher, journal data.

## Request

### Request url

```typescript
DELETE`/company/:companyId/journal/:journalId`;
```

### Query

| name      | type   | description                | required | default |
| --------- | ------ | -------------------------- | -------- | ------- |
| companyId | number | specific id of the company | yes      | -       |
| journalId | number | specific id of the journal | yes      | -       |

### Request Example

```typescript
DELETE`/company/1/journal/10000035`;
```

## Response

### Response Parameters

| name    | type             | description                  |
| ------- | ---------------- | ---------------------------- |
| powerby | string           | iSunFA v0.1.2+50             |
| success | boolean          | true or false                |
| code    | string           | response code                |
| message | string           | description of response data |
| payload | IJournal \| null | response data                |

### IJournal

| name          | type                      | description                       |
| ------------- | ------------------------- | --------------------------------- |
| id            | number                    | the id of the journal             |
| event         | JOURNAL_EVENT             | the journal event                 |
| tokenContract | string                    | the token contract address        |
| tokenId       | string                    | the token identifier              |
| aichResultId  | string                    | the AI check result identifier    |
| projectId     | number                    | the project identifier            |
| contractId    | number                    | the contract identifier           |
| imageUrl      | string                    | the image URL                     |
| invoice       | IInvoice                  | the invoice data                  |
| voucher       | IVoucherDataForSavingToDB | the voucher data for saving to DB |

### JOURNAL_EVENT

```typescript
JOURNAL_EVENT {
  UPLOADED = 'JOURNAL.UPLOADED',
  UPCOMING = 'JOURNAL.UPCOMING',
}
```

### IInvoice

| name             | type          | description                                            |
| ---------------- | ------------- | ------------------------------------------------------ |
| journalId        | number        | the id of the journal                                  |
| date             | number        | The timestamp representing the date and time. (second) |
| eventType        | EventType     | The type of event ('income', 'payment', 'transfer').   |
| paymentReason    | string        | The reason for the payment.                            |
| description      | string        | A description of the transaction.                      |
| vendorOrSupplier | string        | The name of the vendor or supplier involved.           |
| projectId        | string \|null | The identifier for the project. (can be null )         |
| project          | string \|null | The name of the project. (can be null )                |
| contractId       | string \|null | The unique identifier for the contract. (can be null ) |
| contract         | string \|null | The name or title of the contract. (can be null )      |
| payment          | Payment       | A object containing payment details.                   |

### IVoucherDataForSavingToDB

| name      | type          | description                                                              |
| --------- | ------------- | ------------------------------------------------------------------------ |
| journalId | number        | the id of the journal                                                    |
| lineItems | ILineItem\[\] | Line items of voucher, each line item represent each line in irl voucher |

### ILineItem

| name          | type    | description                                                                                                                                     |
| ------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| lineItemIndex | string  | The unique index of the line item entry. But this has no actual meaning, just random response from aich, real id will be number and store in db |
| account       | string  | The account associated with the line item.                                                                                                      |
| description   | string  | A detailed description of the line item.                                                                                                        |
| debit         | boolean | Indicates if the item is a debit (true) or credit (false).                                                                                      |
| amount        | number  | The monetary amount of the line item.                                                                                                           |

### Payment

| name               | type                     | description                                                                                    |
| ------------------ | ------------------------ | ---------------------------------------------------------------------------------------------- |
| isRevenue          | boolean                  | Indicates if the transaction will generate income. True: money is coming in; false: going out. |
| price              | number                   | The total amount of money involved in the transaction.                                         |
| hasTax             | boolean                  | Specifies whether the amount includes tax.                                                     |
| taxPercentage      | number                   | The tax rate, for example, 0 or 5, etc.                                                        |
| hasFee             | boolean                  | Indicates whether there is a handling fee included.                                            |
| fee                | number                   | The amount of the handling fee.                                                                |
| paymentMethod      | string                   | The method by which money is received or paid out.                                             |
| paymentPeriod      | PaymentPeriodType (enum) | The timing of payment, either at once (atOnce) or in installments (installment).               |
| installmentPeriod  | number                   | The number of installments for payment.                                                        |
| paymentAlreadyDone | number                   | The amount of money that has already been paid or collected.                                   |
| paymentStatus      | PaymentStatusType(enum)  | The status of the payment. "paid" or "unpaid" or "partial                                      |
| progress           | number                   | The actual work completion percentage for a contract, not referring to payment progress.       |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.8+103",
  "success": true,
  "code": "200ISF0004",
  "message": "Delete successfully",
  "payload": {
    "id": 10000035,
    "event": "JOURNAL.UPLOADED",
    "tokenContract": "",
    "tokenId": "",
    "aichResultId": "b284a6f08a45ba147252",
    "projectId": 0,
    "contractId": 0,
    "imageUrl": "",
    "invoice": {
      "journalId": 10000035,
      "date": 1719936000,
      "eventType": "payment",
      "paymentReason": "a",
      "description": "sdf",
      "vendorOrSupplier": "asd",
      "projectId": null,
      "project": null,
      "contractId": null,
      "contract": null,
      "payment": {
        "isRevenue": true,
        "price": 1234,
        "hasTax": false,
        "taxPercentage": 0,
        "hasFee": false,
        "fee": 0,
        "method": "PAYMENT_METHOD.CASH",
        "period": "atOnce",
        "installmentPeriod": 0,
        "alreadyPaid": 0,
        "status": "unpaid",
        "progress": 0
      }
    },
    "voucher": {
      "journalId": 10000035,
      "lineItems": [
        {
          "lineItemIndex": "10000106",
          "amount": 1,
          "debit": true,
          "account": "銀行存款",
          "description": "",
          "accountId": 10000542
        },
        {
          "lineItemIndex": "10000107",
          "amount": 1,
          "debit": false,
          "account": "庫存現金",
          "description": "",
          "accountId": 10000540
        }
      ]
    }
  }
}
```

- 失敗的回傳
  ```json
  {
    "powerby": "iSunFA v0.1.2+50",
    "success": false,
    "code": "400",
    "message": "bad request",
    "payload": null
  }
  ```

# updateAVoucherById

- Description: This API provides the functionality to update a voucher info.

## Request

### Request url

```
PUT /company/:companyId/voucher/:voucherId
```

### Query

| name      | type   | description                | required | default |
| --------- | ------ | -------------------------- | -------- | ------- |
| companyId | number | specific id of the company | yes      | -       |
| voucherId | number | specific id of the voucher | yes      | -       |

### Body

| name    | type                      | description                                                     | require |
| ------- | ------------------------- | --------------------------------------------------------------- | ------- |
| voucher | IVoucherDataForSavingToDB | read down below, this combine two data, journalId and lineItems | true    |

#### IVoucherDataForSavingToDB

| name      | type        | description                                                       | require  |
| --------- | ----------- | ----------------------------------------------------------------- | -------- |
| journalId | number      | the index of journal that will be connect to new voucher          | **true** |
| lineItems | ILineItem[] | the line items of the voucher (ILineItems need to have accountId) | true     |

### Request Example

```
PUT /company/1/voucher/1
```

Body: JSON type

```json
{
  "voucher": {
    "journalId": 15,
    "lineItems": [
      {
        "lineItemIndex": "'20240426001'",
        "account": "'電信費'",
        "description": "'光世代電路月租費： 593, HiNet企業專案服務費: 1607'",
        "debit": true,
        "amount": 2210,
        "accountId": 1
      },
      {
        "lineItemIndex": "'20240325002'",
        "account": "'進項稅額'",
        "description": "'WSTP會計師工作輔助幡: 88,725, 文中網路版主機授權費用: 8,400, 文中工作站授權費用: 6,300'",
        "debit": true,
        "amount": 110,
        "accountId": 2
      },
      {
        "lineItemIndex": "'20240426003'",
        "account": "'銀行存款'",
        "description": "'合庫銀行'",
        "debit": false,
        "amount": 2310,
        "accountId": 3
      }
    ]
  }
}
```

## Response

### Response Parameters

| name    | type                | description                                                      |
| ------- | ------------------- | ---------------------------------------------------------------- |
| powerby | string              | iSunFA v0.1.2+50                                                 |
| success | boolean             | true or false                                                    |
| code    | string              | response code                                                    |
| message | string              | description the status of the request                            |
| payload | Custom type \| null | the shape of data has no interface, but it follow Prisma.voucher |

#### payload custom type

| name      | type                      | description                                                                          |
| --------- | ------------------------- | ------------------------------------------------------------------------------------ |
| id        | string                    | the id of the **voucher** that was created                                           |
| journalId | number                    | the journal that the voucher connect to                                              |
| no        | string                    | the voucher serial number, it will increase base on company, format is `YYYYMMDD001` |
| createdAt | number                    | the timestamp of the voucher created (timestamp in second)                           |
| updatedAt | number                    | the timestamp of the voucher updated (timestamp in second)                           |
| lineItems | Prisma.LineItem[] \| null | the lineItems that was created                                                       |

#### Prisma.LineItem

| name        | type    | description                                                 |
| ----------- | ------- | ----------------------------------------------------------- |
| id          | number  | the id of the lineItem                                      |
| amount      | number  | the amount of the lineItem                                  |
| description | string  | the description of the lineItem                             |
| debit       | boolean | is debit or credit                                          |
| accountId   | number  | the account that the lineItem connect to                    |
| voucherId   | number  | the voucher that the lineItem connect to                    |
| createdAt   | number  | the timestamp of the lineItem created (timestamp in second) |
| updatedAt   | number  | the timestamp of the lineItem updated (timestamp in second) |

### Response Example

- 成功的回傳

```json
{
  "powerby": "iSunFA v0.1.4+78",
  "success": true,
  "code": "201ISF0000",
  "message": "Created successfully",
  "payload": {
    "id": 1,
    "journalId": 1,
    "no": "2024617001",
    "createdAt": 1718612861,
    "updatedAt": 1718612861,
    "lineItems": [
      {
        "id": 2,
        "amount": 110,
        "description": "'WSTP會計師工作輔助幡: 88,725, 文中網路版主機授權費用: 8,400, 文中工作站授權費用: 6,300'",
        "debit": true,
        "accountId": 61,
        "voucherId": 1,
        "createdAt": 1718612861,
        "updatedAt": 1718612861
      },
      {
        "id": 1,
        "amount": 2210,
        "description": "'光世代電路月租費： 593, HiNet企業專案服務費: 1607'",
        "debit": true,
        "accountId": 61,
        "voucherId": 1,
        "createdAt": 1718612861,
        "updatedAt": 1718612861
      },
      {
        "id": 3,
        "amount": 2310,
        "description": "'合庫銀行'",
        "debit": false,
        "accountId": 61,
        "voucherId": 1,
        "createdAt": 1718612861,
        "updatedAt": 1718612861
      }
    ]
  }
}
```

- 失敗的回傳

```json
{
  "powerby": "iSunFA v0.1.2+50",
  "success": false,
  "code": "502",
  "message": "Bad gateway data from AICH is invalid type",
  "payload": {}
}
```

# getFinancialReportById

- description: get Financial Report by id, it will return Balance sheet, Income statement or cash
  flow

## Request

### Request url

```
GET /company/:companyId/report_financial/:reportId
```

### Params

| name      | type   | description                                      | required | default |
| --------- | ------ | ------------------------------------------------ | -------- | ------- |
| companyId | number | specific id of the company, can be random number | yes      | -       |
| reportId  | number | specific id of the report                        | yes      | -       |

### Request Example

```
GET /company/1/report_financial/1
```

## Response

### Response Paremeter

| name    | type            | description      |
| ------- | --------------- | ---------------- |
| powerby | string          | iSunFA v0.1.2+50 |
| success | boolean         | true or false    |
| code    | string          | response code    |
| message | string          | description      |
| payload | FinancialReport | the data         |

#### FinancialReport

| name       | type                                                                                                                                                                                          | description                                                       |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| company    | `{id: number, code: string, name: string}`                                                                                                                                                    | company related info                                              |
| preDate    | `{from: number, to: number }`                                                                                                                                                                 | last period time spam, it will be same date of curDate last year  |
| curDate    | `{from: number, to: number }`                                                                                                                                                                 | it will be from and to of current date                            |
| reportType | ReportSheetType `{ BALANCE_SHEET = 'balanceSheet', INCOME_STATEMENT = 'incomeStatement', CASH_FLOW_STATEMENT = 'cashFlowStatement', CHANGE_IN_EQUITY_STATEMENT = 'changeInEquityStatement',}` | Frinancial Report type                                            |
| general    | FinancialReportItem\[\]                                                                                                                                                                       | simplified version of financial report rows                       |
| detail     | FinancialReportItem\[\]                                                                                                                                                                       | detail version of financial report rows                           |
| otherInfo  | BalanceSheetOtherInfo \| IncomeStatementOtherInfo \| CashFlowStatementOtherInfo                                                                                                               | base on your financial report type, it will return different info |

##### FinancialReportItem

| name                  | type   | description                                                                |
| --------------------- | ------ | -------------------------------------------------------------------------- |
| code                  | string | code of accounting                                                         |
| name                  | string | name of accounting                                                         |
| curPeriodAmount       | number | this period amount of money                                                |
| curPeriodAmountString | string | this period amount of money but in string, it will be brackets if negative |
| curPeriodPercentage   | string | percentage of amount vs total amount of that account category              |
| prePeriodAmount       | number | last period amount of money                                                |
| prePeriodAmount       | string | last period amount of money but in string, it will be brackets if negative |
| prePeriodPercentage   | string | percentage of amount vs total amount of that account category              |
| indent                | number | what level of this account in account tree                                 |

##### BalanceSheetOtherInfo

| name                | type      | description |
| ------------------- | --------- | ----------- |
| assetLiabilityRatio | `{date:}` |
