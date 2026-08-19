function hasMojibake(text: string): boolean {
  return /Ã.|Â.|â.|ð.|�/.test(text);
}

function repairMojibake(text: string): string {
  if (!hasMojibake(text)) {
    return text;
  }

  try {
    return Buffer.from(text, 'latin1').toString('utf8');
  } catch {
    return text;
  }
}

export function normalizeDescription(
  description: string | null | undefined
): string | null {
  if (!description) {
    return null;
  }

  let html = repairMojibake(description);

  // Normalize different line-break formats.
  html = html
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Two or more <br> tags = paragraph boundary.
  html = html.replace(
    /(?:<br\s*\/?>\s*){2,}/gi,
    '</p><p>'
  );

  // Remaining single <br> tags stay as line breaks.
  html = html.replace(
    /(<p>)\s*(?:<br\s*\/?>\s*)+/gi,
    '$1'
  );

  html = html.replace(
    /(?:\s*<br\s*\/?>\s*)+(<\/p>)/gi,
    '$1'
  );

  // If the source contains plain text separated by <p>,
  // don't accidentally create empty paragraphs.
  html = html.replace(/<p>\s*<\/p>/gi, '');

  return html.trim();
}