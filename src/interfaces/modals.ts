export interface RegisterFormModalProps {
  username: string;
}

export interface BookmarkItem {
  name: string;
  icon: JSX.Element;
  added: boolean;
  tempSelectedOnSection?: boolean;
  tempSelectedOnModal?: boolean;
}
