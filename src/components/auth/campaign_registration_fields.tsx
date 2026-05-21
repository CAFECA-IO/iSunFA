import { useTranslation } from "@/i18n/i18n_context";

interface ICampaignData {
  id: string;
  code: string;
  name: string;
  description: string;
  bonusPoints: string;
  bonusModules: string[];
}

interface ICampaignRegistrationFieldsProps {
  campaignCode: string;
  setCampaignCode: (val: string) => void;
  verifyingCampaign: boolean;
  campaignError: string;
  campaignData: ICampaignData | null;
  entityType: string;
  setEntityType: (val: string) => void;
  entityName: string;
  setEntityName: (val: string) => void;
  contactEmail: string;
  setContactEmail: (val: string) => void;
  contactPhone: string;
  setContactPhone: (val: string) => void;
}

export default function CampaignRegistrationFields({
  campaignCode,
  setCampaignCode,
  verifyingCampaign,
  campaignError,
  campaignData,
  entityType,
  setEntityType,
  entityName,
  setEntityName,
  contactEmail,
  setContactEmail,
  contactPhone,
  setContactPhone,
}: ICampaignRegistrationFieldsProps) {
  const { t } = useTranslation();

  return (
    <>
      <div>
        <label
          htmlFor="campaignCode"
          className="block text-sm leading-6 font-medium text-gray-900"
        >
          {t("auth_modal.campaign_reg.code_label")}
        </label>
        <div className="relative mt-2">
          <input
            id="campaignCode"
            aria-label="活動代碼"
            type="text"
            value={campaignCode}
            onChange={(e) =>
              setCampaignCode(
                e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
              )
            }
            className="block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-orange-600 focus:ring-inset sm:text-sm sm:leading-6"
            placeholder={t("auth_modal.campaign_reg.code_placeholder")}
          />
          {verifyingCampaign && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-orange-600"></div>
            </div>
          )}
        </div>
        {campaignError && (
          <p className="mt-1 text-sm text-red-600">{campaignError}</p>
        )}
        {campaignData && !verifyingCampaign && (
          <p className="mt-1 text-sm text-green-600">
            {t("auth_modal.campaign_reg.success_msg")}
          </p>
        )}
      </div>

      {campaignData && (
        <div className="mt-4 overflow-hidden rounded-xl border border-orange-200 bg-gradient-to-b from-orange-50 to-white">
          <div className="border-b border-orange-100 bg-orange-50/50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-xl">
                🎉
              </div>
              <div>
                <h4 className="text-base font-bold text-gray-900">
                  {campaignData.name}
                </h4>
                {campaignData.description && (
                  <p className="mt-0.5 text-xs text-gray-500">
                    {campaignData.description}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-3 inline-flex items-center rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800 ring-1 ring-orange-200 ring-inset">
              {t("auth_modal.campaign_reg.earn_points")}
              {campaignData.bonusPoints}{" "}
              {t("auth_modal.campaign_reg.points_unit")}
              {campaignData.bonusModules.length > 0 &&
                `${t("auth_modal.campaign_reg.unlock_modules")} (${campaignData.bonusModules.join(", ")})`}
            </div>
          </div>

          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="entityType"
                  className="block text-xs font-medium text-gray-700"
                >
                  {t("auth_modal.campaign_reg.entity_type")}
                </label>
                <select
                  id="entityType"
                  aria-label={t("auth_modal.campaign_reg.entity_type")}
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  className="mt-1 block w-full rounded-md border-0 bg-white py-1.5 pr-8 pl-3 text-gray-900 ring-1 ring-gray-300 ring-inset focus:ring-2 focus:ring-orange-600 focus:ring-inset sm:text-sm sm:leading-6"
                >
                  <option value="individual">
                    {t("auth_modal.campaign_reg.type_individual")}
                  </option>
                  <option value="company">
                    {t("auth_modal.campaign_reg.type_company")}
                  </option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="entityName"
                  className="block text-xs font-medium text-gray-700"
                >
                  {t("auth_modal.campaign_reg.name_label")}
                </label>
                <input
                  id="entityName"
                  aria-label={t("auth_modal.campaign_reg.name_label")}
                  type="text"
                  required
                  value={entityName}
                  onChange={(e) => setEntityName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-0 bg-white px-3 py-1.5 text-gray-900 ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-orange-600 focus:ring-inset sm:text-sm sm:leading-6"
                  placeholder={t("auth_modal.campaign_reg.name_placeholder")}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="contactEmail"
                  className="block text-xs font-medium text-gray-700"
                >
                  {t("auth_modal.campaign_reg.email_label")}
                </label>
                <input
                  id="contactEmail"
                  aria-label={t("auth_modal.campaign_reg.email_label")}
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border-0 bg-white px-3 py-1.5 text-gray-900 ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-orange-600 focus:ring-inset sm:text-sm sm:leading-6"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label
                  htmlFor="contactPhone"
                  className="block text-xs font-medium text-gray-700"
                >
                  {t("auth_modal.campaign_reg.phone_label")}
                </label>
                <input
                  id="contactPhone"
                  aria-label={t("auth_modal.campaign_reg.phone_label")}
                  type="tel"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="mt-1 block w-full rounded-md border-0 bg-white px-3 py-1.5 text-gray-900 ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-orange-600 focus:ring-inset sm:text-sm sm:leading-6"
                  placeholder="0912345678"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
