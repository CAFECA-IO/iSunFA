# getProcessedJournalData
## Description
Retrieve the data processed from the document/image upload, which can be used to create a new income or expense line item.

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
| name    | type        | description                               |
| ------- | ----------- | ----------------------------------------- |
| powerby | string      | The version of the API                    |
| success | boolean     | Whether the data retrieval was successful |
| code    | string      | The response code                         |
| message | string      | A message about the result data           |
| payload | JournalData | The data processed from the document      |

### JournalData
| name          | type              | description                                         |
| ------------- | ----------------- | --------------------------------------------------- |
| id            | string            | Unique identifier for the journal.                  |
| tokenContract | string            | The contract address for the token.                 |
| tokenId       | string            | Identifier for the specific token.                  |
| voucherIndex  | string            | Index of the voucher within a collection or series. |
| invoiceIndex  | string            | Index of the invoice associated with the voucher.   |
| metadatas     | VoucherMetaData[] | Array of metadata associated with the voucher.      |
| lineItems     | LineItem[]        | Array of line items detailed in the voucher.        |

### VoucherMetaData
| name              | type              | description                                                      |
| ----------------- | ----------------- | ---------------------------------------------------------------- |
| date              | number            | The date of the voucher.                                         |
| voucherType       | VoucherType       | The type of the voucher.                                         |
| companyId         | string            | Identifier for the company.                     |
| companyName       | string            | The name of the vendor or supplier.                              |
| description       | string            | A brief description of the voucher.                              |
| totalPrice        | number            | The total price or amount of the voucher.                        |
| taxPercentage     | number            | The tax percentage applied to the voucher.                       |
| fee               | number            | Any additional fee associated with the voucher.                  |
| paymentMethod     | string            | The method used for payment.                                     |
| paymentPeriod     | PaymentPeriodType | The period over which payments are made.                         |
| installmentPeriod | number            | The number of periods over which payments are installment.       |
| paymentStatus     | PaymentStatusType | The current status of the payment.                               |
| alreadyPaidAmount | number            | The amount that has already been paid.                           |
| reason            | string            | The reason for the payment, previously known as 'paymentReason'. |
| projectId         | string            | Identifier for the related project.                              |
| project           | string            | The name or description of the related project.                  |
| contractId        | string            | Identifier for the related contract.                             |
| contract          | string            | The name or description of the related contract.                 |

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
  "powerby": "ISunFa API v1.0.0",
  "success": true,
  "code": "200",
  "message": "OCR result data retrieved successfully.",
  "payload": {
    "eventType": "expense",
    "date": "2024-03-27",
    "reason": "Equipment",
    "vendorSupplier": "優質辦公設備有限公司",
    "description": "Buy a new printer",
    "totalPrice": 30000,
    "paymentMethod": "Transfer",
    "paymentPeriod": "At Once",
    "paymentStatus": "Paid",
    "project": "BAIFA",
    "contract": "Contract123",
    "accountVoucher":{
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
}
```

- Failure Response

```json
{
  "powerby": "ISunFa API v1.0.0",
  "success": false,
  "code": "400",
  "message": "Unable to retrieve OCR result data."
}
```