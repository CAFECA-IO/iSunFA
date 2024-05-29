export interface IConfirmModal {
  journalId: number | undefined;
  askAIId: string | undefined;
}

export const dummyConfirmModalData: IConfirmModal = {
  journalId: undefined,
  askAIId: undefined,
};
