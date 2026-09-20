/** Shared local-only query grammar. Never forwards private text or queries to a service. */
export interface ContextDocument {
  text: string;
  author?: string;
  kind?: string;
  collection?: string;
  createdAt?: number;
}

export function compileContextQuery(query: string): (document: ContextDocument) => boolean {
  const normalize = (text: string) => text.normalize('NFKC').toLowerCase();
  const terms = [...query.matchAll(/(-?)(?:(author|kind|collection|after|before):)?("[^"]*"|\S+)/gi)].map(match => {
    const value = normalize(match[3].replace(/^"|"$/g, ''));
    const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? Date.parse(`${value}T00:00:00Z`) : NaN;
    return { exclude: match[1] === '-', field: match[2]?.toLowerCase(), value,
      date: Number.isFinite(date) && new Date(date).toISOString().startsWith(value) ? date : NaN };
  });
  return document => terms.every(({ exclude, field, value, date }) => {
    let matches: boolean;
    if (field === 'after' || field === 'before') {
      matches = Number.isFinite(date) && document.createdAt !== undefined && (field === 'after' ? document.createdAt >= date : document.createdAt < date);
    } else if (field === 'kind') matches = normalize(document.kind || '') === value;
    else if (field === 'author' || field === 'collection') matches = normalize(document[field] || '').includes(value);
    else matches = normalize(document.text).includes(value);
    return exclude ? !matches : matches;
  });
}
