/** Preserve currency and escaped dollars while recognizing paired math delimiters. */
export function replaceInlineMath(text: string, render: (math: string) => string): string {
  const dollar = (index: number): boolean => {
    if (text[index] !== '$' || text[index - 1] === '$' || text[index + 1] === '$') return false;
    let escapes = 0;
    for (let i = index - 1; i >= 0 && text[i] === '\\'; i--) escapes++;
    return escapes % 2 === 0;
  };
  let output = '', cursor = 0;
  for (let start = 0; start < text.length; start++) {
    if (!dollar(start) || /\s/.test(text[start + 1] ?? ' ')) continue;
    let end = start + 1;
    while (end < text.length && text[end] !== '\n' && !dollar(end)) end++;
    if (end === text.length || text[end] === '\n') continue;
    const math = text.slice(start + 1, end);
    // A closing dollar followed by a digit is the next price's opening dollar.
    // Bare numeric amounts and prose beginning with an amount remain plain text.
    if (/\d/.test(text[end + 1] ?? '') || /\s$/.test(math)
      || /^\d[\d,.]*$/.test(math)
      || (/^\d/.test(math) && !/[=+*^_\\{}<>]/.test(math) && /[a-zA-Z]{2,}/.test(math))) continue;
    output += text.slice(cursor, start) + render(math);
    cursor = end + 1;
    start = end;
  }
  return output + text.slice(cursor);
}
