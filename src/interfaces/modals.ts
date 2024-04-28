export interface RegisterFormModalProps {
  username: string;
}

export interface BookmarkItem {
  name: string;
  icon: JSX.Element;
  added: boolean;
  link: string;
  tempSelectedOnSection?: boolean;
  tempSelectedOnModal?: boolean;
}
