/*
  Warnings:

  - A unique constraint covering the columns `[plan_id,feature_key]` on the table `team_plan_feature` will be added. If there are existing duplicate values, this will fail.

*/

-- CreateIndex
CREATE UNIQUE INDEX "team_plan_feature_plan_id_feature_key_key" ON "team_plan_feature"("plan_id", "feature_key");

-- DropIndex
DROP INDEX "invite_team_member_email_key";

