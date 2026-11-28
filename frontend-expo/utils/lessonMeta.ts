export type LessonMeta = {
  id: number;
  title: string;
  description: string;
  /** Lesson text with the header block removed. */
  body: string;
};

/**
 * Reads a lesson .md file. An optional header block at the very top sets the
 * card title/description:
 *
 *   ---
 *   title: The Pieces
 *   description: Meet the chess pieces!
 *   ---
 *
 * Without a title, the first non-empty line of the file is used.
 */
export function parseLesson(text: string, id: number): LessonMeta {
  const normalized = text.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const fields: Record<string, string> = {};
  let body = normalized;

  const header = normalized.match(/^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
  if (header) {
    for (const line of header[1].split('\n')) {
      const sep = line.indexOf(':');
      if (sep === -1) continue;
      const key = line.slice(0, sep).trim().toLowerCase();
      const value = line.slice(sep + 1).trim();
      if (key && value) fields[key] = value;
    }
    body = normalized.slice(header[0].length);
  }

  const firstLine = body
    .split('\n')
    .map(line => line.replace(/^#+\s*/, '').trim())
    .find(line => line.length > 0);

  return {
    id,
    title: fields.title || firstLine || `Lesson ${id}`,
    description: fields.description || '',
    body,
  };
}
