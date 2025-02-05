export const parseNoteData = (
  data: string | { note: string; name: string; taxId: string } | object
): { note: string; name: string | undefined; taxId: string | undefined } => {
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      if (typeof parsed === 'object' && parsed !== null && 'note' in parsed) {
        return {
          note: String(parsed.note),
          name: parsed.name ?? undefined,
          taxId: parsed.taxId ?? undefined,
        };
      }
    } catch {
      return { note: data, name: undefined, taxId: undefined };
    }
  }

  if (typeof data === 'object' && data !== null) {
    return {
      note: 'note' in data ? String(data.note) : JSON.stringify(data),
      name: 'name' in data ? String(data.name) : undefined,
      taxId: 'taxId' in data ? String(data.taxId) : undefined,
    };
  }

  return { note: '', name: undefined, taxId: undefined };
};
