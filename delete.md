# updateOwnAccountInfoById
- description: This API provides the functionality to update the information(name) of owned account.
## Request
### Request url
```typescript
PUT `/company/:companyId/account/:accountId`
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
PUT `/company/99999991/account/1474`

const body = {
  "name": "華奇銀行2"
}
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
        "companyId": 99999991,
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
        "code":  "400",
        "message": "update failed",
        "payload": {}
    }
    ```






# deleteOwnAccountById
- description: This API provides the functionality to delete an owned account by update deleted time.
## Request
### Request url
```typescript
DELETE `/company/:companyId/account/:accountId`
```
### Param
| name      | type   | description                                | required | default |
| --------- | ------ | ------------------------------------------ | -------- | ------- |
| accountId | string | the unique id of the account to be deleted | yes      | -       |

### Request Example
```typescript
DELETE `/company/99999991/account/1474`
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
        "companyId": 99999991,
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
        "code":  "400",
        "message": "delete failed",
        "payload": {}
    }
    ```