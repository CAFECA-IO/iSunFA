- [x] S020001 - GET /company/:companyId/salary - ISFMK00067 
- [x] S020002 - POST /company/:companyId/salary - ISFMK00067 
- [x] S020003 - PUT /company/:companyId/salary - ISFMK00067 
- [x] S020004 - GET /company/:companyId/salary/:salaryId - ISFMK00039, ISFMK00023
- [x] S020005 - PUT /company/:companyId/salary/:salaryId - ISFMK00039, ISFMK00023
- [x] S021001 - POST /company/:companyId/salary/voucher
- [x] S022001 - GET /company/:companyId/salary/folder - ISFMK00078
- [x] S022002 - GET /company/:companyId/salary/folder/:folderId - ISFMK00076
- [x] S022003 - PUT /company/:companyId/salary/folder/:folderId - ISFMK00076

# getAllSalaryRecords
- description: This API provides the functionality to get all salary records.
## Request
### Request url
```typescript
GET `/company/:companyId/salary`
```
### Query
| name      | type   | description                | required | default |
| --------- | ------ | -------------------------- | -------- | ------- |
| companyId | number | specific id of the company | yes      | -       |


### Request Example
```typescript
GET `/company/1/salary`
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
| insurancePayment   | number  | insurance paid by the company(健保+勞保+勞退)        |
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
        "code":  "400",
        "message": "bad request",
        "payload": {}
    }
    ```

# postSalaryRecords
- description: This API provides the functionality to post many salary records.
## Request
### Request url
```typescript
POST `/company/:companyId/salary`
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
POST `/company/1/salary`
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
| insurancePayment   | number  | insurance paid by the company(健保+勞保+勞退)        |
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
        "code":  "400",
        "message": "bad request",
        "payload": {}
    }
    ```

# putSalaryRecords
- description: This API provides the functionality to update unconfirmed salary records.
## Request
### Request url
```typescript
PUT `/company/:companyId/salary`
```
### Query
| name      | type   | description                | required | default |
| --------- | ------ | -------------------------- | -------- | ------- |
| companyId | number | specific id of the company | yes      | -       |


### Request Example
```typescript
PUT `/company/1/salary`
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
| insurancePayment   | number  | insurance paid by the company(健保+勞保+勞退)        |
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
        "code":  "400",
        "message": "bad request",
        "payload": {}
    }
    ```

# getASalaryRecord
- description: This API provides the functionality to get a salary record.
## Request
### Request url
```typescript
GET `/company/:companyId/salary/:salaryId`
```
### Query
| name      | type   | description                      | required | default |
| --------- | ------ | -------------------------------- | -------- | ------- |
| companyId | number | specific id of the company       | yes      | -       |
| salaryId  | number | specific id of the salary record | yes      | -       |


### Request Example
```typescript
GET `/company/1/salary/1`
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
        "code":  "400",
        "message": "bad request",
        "payload": {}
    }
    ```

# putASalaryRecord
- description: This API provides the functionality to update a salary record.
## Request
### Request url
```typescript
PUT `/company/:companyId/salary/:salaryId`
```
### Query
| name      | type   | description                      | required | default |
| --------- | ------ | -------------------------------- | -------- | ------- |
| companyId | number | specific id of the company       | yes      | -       |
| salaryId  | number | specific id of the salary record | yes      | -       |

### Body
| name             | type                           | description                            |
| ---------------- | ------------------------------ | -------------------------------------- |
| department       | string                         | department of the employee             |
| name             | string                         | name of the employee                   |
| salary           | number                         | salary of the employee                 |
| bonus            | number                         | bonus of the employee                  |
| insurancePayment | number                         | insurance paid by the company(健保+勞保+勞退)    |
| description      | string                         | description of the salary record              |
| projects         | { id: number; name: string; hours: number }[] | involved projects info of the salary record |
| startDate          | number                         | start duration of the salary record                |
| endDate            | number                         | end duration of the salary record                  |
| workingHours        | number                         | working hours in the duration of the salary record |


### Request Example
```typescript
PUT `/company/1/salary/1`
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
        "code":  "400",
        "message": "bad request",
        "payload": {}
    }
    ```


# postAVoucher
- description: This API provides the functionality to post a voucher for salary records.
## Request
### Request url
```typescript
POST `/company/:companyId/salary/voucher`
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
POST `/company/1/salary/voucher`
```

- Body
```json
{
    "salaryRecordsIdsList": [10000000,10000001,10000002],
    "voucherType": "Salary"    
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
        "code":  "400",
        "message": "bad request",
        "payload": {}
    }
    ```

# getAllSalaryVoucherFolders
- description: This API provides the functionality to get all salary voucher folders.
## Request
### Request url
```typescript
GET `/company/:companyId/salary/folder`
```
### Query
| name      | type   | description                | required | default |
| --------- | ------ | -------------------------- | -------- | ------- |
| companyId | number | specific id of the company | yes      | -       |


### Request Example
```typescript
GET `/company/1/salary/folder`
```

## Response

### Response Parameters

| name    | type                                   | description                  |
| ------- | -------------------------------------- | ---------------------------- |
| powerby | string                                 | iSunFA v0.1.2+50             |
| success | boolean                                | true or false                |
| code    | string                                 | response code                |
| message | string                                 | description of response data |
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
        "code":  "400",
        "message": "bad request",
        "payload": {}
    }
    ```

# getASalaryVoucherFolder
- description: This API provides the functionality to get a salary voucher folder with voucher and salary records.
## Request
### Request url
```typescript
GET `/company/:companyId/salary/folder/:folderId`
```
### Query
| name      | type   | description                | required | default |
| --------- | ------ | -------------------------- | -------- | ------- |
| companyId | number | specific id of the company | yes      | -       |
| folderId  | number | specific id of the folder  | yes      | -       |


### Request Example
```typescript
GET `/company/10000000/salary/folder/10000000`
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
| insurancePayment   | number  | insurance paid by the company(健保+勞保+勞退)        |
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
        "code":  "400",
        "message": "bad request",
        "payload": {}
    }
    ```

# putASalaryVoucherFolder

- description: This API provides the functionality to update a name of a salary voucher folder.
## Request
### Request url
```typescript
PUT `/company/:companyId/salary/folder/:folderId`
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
PUT `/company/10000000/salary/folder/10000000`
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
        "code":  "400",
        "message": "bad request",
        "payload": {}
    }
    ```


# getAllEmployees
- description: This API provides the functionality to get all employees information.
## Request
### Request url
```typescript
GET `/company/:companyId/employee`
```

### Query
| name        | type   | description                                        | required | default |
| ----------- | ------ | -------------------------------------------------- | -------- | ------- |
| targetPage  | string | the page number to be retrieved                    | false     | 1       |
| pageSize    | string | the number of items per page                       | false     | 10      |
| searchQuery | string | the query string used to search for specific items | false    | ""      |

### Request Example
```typescript
GET `/company/10000000/employee?targetPage=2&pageSize=2`
```

## Response

### Response Parameters

| name    | type                    | description                  |
| ------- | ----------------------- | ---------------------------- |
| powerby | string                  | iSunFA v0.1.2+50             |
| success | boolean                 | true or false                |
| code    | string                  | response code                |
| message | string                  | description of response data |
| payload | IEasyEmployeeWithPagination \| null | response data       |

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
        "code":  "400",
        "message": "bad request",
        "payload": null
    }
    ```

# createAnEmployee
- description: This API provides the functionality to create a new employee information.
## Request
### Request url
```typescript
POST `/company/:companyId/employee`
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
POST `/company/1/employee`
```

-Body
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
        "code":  "400",
        "message": "create employee failed",
        "payload": null
    }
    ```

# getAnEmployee
- description: This API provides the functionality to query specific employee information.
## Request
### Request url
```typescript
GET `/company/:companyId/employee/:employeeId`
```
### Query
| name       | type   | description                | required | default |
| ---------- | ------ | -------------------------- | -------- | ------- |
| companyId  | string | specific id of the company | yes      | -       |
| employeeId | string | specific employee number   | yes      | -       |


### Request Example
```typescript
GET `/company/1/employee/3`
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
        "code":  "400",
        "message": "bad request",
        "payload": {}
    }
    ```

# DeleteAnEmployee
- description: This API provides the functionality to mark an resigned employee by updating end date.
## Request
### Request url
```typescript
DELETE `/company/:companyId/employee/:employeeId`
```
### Query
| name       | type   | description                | required | default |
| ---------- | ------ | -------------------------- | -------- | ------- |
| companyId  | string | specific id of the company | yes      | -       |
| employeeId | string | specific employee number   | yes      | -       |

### Request Example
```typescript
DELETE `/company/1/employee/3`
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
        "code":  "400",
        "message": "delete employee failed",
        "payload": {}
    }
    ```

# UpdateAnEmployee
- description: This API provides the functionality to update specific employee information.
## Request
### Request url
```typescript
PUT `/company/:companyId/employee/:employeeId`
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
PUT `/company/1/employee/3`
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

| name    | type               | description                   |
| ------- | ------------------ | ----------------------------- |
| powerby | string             | iSunFA v0.1.2+50              |
| success | boolean            | true or false                 |
| code    | string             | response code                 |
| message | string             | description the update status |
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
        "code":  "400",
        "message": "update employee information failed",
        "payload": {}
    }
    ```





# getAllAccounts
- description: This API provides the functionality to get all accounting accounts with pagination.
## Request
### Request url
```typescript
GET `/company/:companyId/account`
```
### Query
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
  - asset, liability, equity, revenue, cost, income, expense, gainOrLoss, otherComprehensiveIncome, cashFlow, changeInEquity, other
- ReportSheetType
  - balanceSheet, incomeStatement, cashFlowStatement, changeInEquityStatement
- EquityType
  - stock, capitalSurplus, retainedEarnings, otherEquity

### Request Example
```typescript
GET `/company/1/account`
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
- 'other'                                                           |

### Response Example
- 成功的回傳
```json
{
  "powerby": "iSunFA v0.1.8+52",
  "success": true,
  "code": "200ISF0002",
  "message": "Get successfully",
  "payload": [
    {
      "id": 10000540,
      "companyId": 99999991,
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
      "companyId": 99999991,
      "system": "IFRS",
      "type": "asset",
      "liquidity": true,
      "debit": true,
      "code": "1102",
      "name": "零用金／週轉金",
      "createdAt": 0,
      "updatedAt": 0,
      "deletedAt": null
    },
    {
      "id": 10000542,
      "companyId": 99999991,
      "system": "IFRS",
      "type": "asset",
      "liquidity": true,
      "debit": true,
      "code": "1103",
      "name": "銀行存款",
      "createdAt": 0,
      "updatedAt": 0,
      "deletedAt": null
    }
  ]
  ...
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

# deleteAJournalById
- description: This API provides the functionality to delete a journal by id through updating delete time for related payment, invoice, lineItem, voucher, journal data.
## Request
### Request url
```typescript
DELETE `/company/:companyId/journal/:journalId`
```
### Query
| name      | type   | description                | required | default |
| --------- | ------ | -------------------------- | -------- | ------- |
| companyId | number | specific id of the company | yes      | -       |
| journalId | number | specific id of the journal | yes      | -       |


### Request Example
```typescript
DELETE `/company/1/journal/10000035`
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
| name             | type           | description                                              |
| ---------------- | -------------- | -------------------------------------------------------- |
| journalId        | null           | this value is not required, just use null                |
| date             | number         | The timestamp representing the date and time. (second)   |
| eventType        | EventType      | The type of event ('income', 'payment', 'transfer').     |
| paymentReason    | string         | The reason for the payment.                              |
| description      | string         | A description of the transaction.                        |
| vendorOrSupplier | string         | The name of the vendor or supplier involved.             |
| projectId        | string \|null  | The identifier for the project.   (can be null )         |
| project          | string  \|null | The name of the project.   (can be null )                |
| contractId       | string  \|null | The unique identifier for the contract.   (can be null ) |
| contract         | string  \|null | The name or title of the contract.   (can be null )      |
| payment          | Payment        | A object containing payment details.                     |

### IVoucherDataForSavingToDB
| name             | type                      | description                                                                                                                               |
| ---------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| journalId        | null                      | The unique identifier for the journal that invoice belongs to. (But when ocr return, it doesn't know which journal it belong, so is null) |
| date             | number                    | The timestamp representing the date and time. (second)                                                                                    |
| eventType        | EventType                 | The type of event ('income', 'payment', 'transfer').                                                                                      |
| paymentReason    | string                    | The reason for the payment.                                                                                                               |
| description      | string                    | A description of the transaction.                                                                                                         |
| venderOrSupplier | string                    | The name of the vendor or supplier involved.                                                                                              |
| projectId        | string (always be "None") | The identifier for the project.   (return "None" due to the fact that aich hasn't fix yet )                                               |
| project          | string (always be "None") | The name of the project.   (return "None" due to the fact that aich hasn't fix yet )                                                      |
| contractId       | string (always be "None") | The unique identifier for the contract.   (return "None" due to the fact that aich hasn't fix yet )                                       |
| contract         | string (always be "None") | The name or title of the contract.   (return "None" due to the fact that aich hasn't fix yet )                                            |
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
| paymentStatus      | PaymentStatusType(enum)  | The status of the payment.  "paid" or "unpaid" or "partial                                     |
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
        "code":  "400",
        "message": "bad request",
        "payload": null
    }
    ```

# updateAVoucher
-  Description: This API provides the functionality to update a voucher info.

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
  "code":  "502",
  "message": "Bad gateway data from AICH is invalid type",
  "payload": {}
}
```

   
              
| 欄位起始 | 欄位說明               |
| -------- | ---------------------- |
| 24-31    | 買受人統一編號 or 空白 |
