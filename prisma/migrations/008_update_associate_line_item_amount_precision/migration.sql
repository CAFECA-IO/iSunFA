-- UpdateAssociateLineItemAmountPrecision
-- Change AssociateLineItem.amount from DECIMAL(20,10) to DECIMAL(26,8) to match LineItem.amount precision

-- Step 1: Update the column precision for associate_line_item.amount
ALTER TABLE "associate_line_item" ALTER COLUMN "amount" TYPE DECIMAL(26,8);

-- Step 2: Add a comment to document the change
COMMENT ON COLUMN "associate_line_item"."amount" IS 'Amount with precision DECIMAL(26,8) to match line_item.amount precision for accounting balance consistency';