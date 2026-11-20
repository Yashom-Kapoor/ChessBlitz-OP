export type LessonSegment = string;

const PACKAGE_STAGE_RE =
  /(?:^|\n)(#\s+[^\n]+)\s*\n+##\s*Instruction\s*\n([\s\S]*?)\n\*\*PUZZLE\*\*\s*\n+\s*([A-Za-z0-9]+)\s*(?:\n+##\s*Feedback\s*\n([\s\S]*?))?(?=\n#\s+[^#]|\s*$)/gi;

const LEGACY_MARKER_RE = /\*\*\*PAGE\*\*\*|\*\*\*PUZZLE\*\*\*/;

/** Number of PAGE/PUZZLE steps in a split-shaped segments array. */
export function lessonStepCount(segments: LessonSegment[]): number {
  if (!segments.length) return 0;
  return Math.max(0, Math.floor((segments.length - 1) / 2));
}

function emptyPageSegments(message = 'No lesson content available.'): LessonSegment[] {
  return ['', '***PAGE***', message];
}

function parsePackageFormat(markdown: string): LessonSegment[] | null {
  const segments: LessonSegment[] = [''];
  let matched = false;

  for (const match of markdown.matchAll(PACKAGE_STAGE_RE)) {
    matched = true;
    const title = (match[1] ?? '').trim();
    const instruction = (match[2] ?? '').trim();
    const puzzleId = (match[3] ?? '').trim();
    const feedback = (match[4] ?? '').trim();

    const pageBody = [title, '', instruction].filter((part, i) => part || i === 1).join('\n').trim();
    segments.push('***PAGE***', pageBody || title || ' ');
    if (puzzleId) {
      segments.push('***PUZZLE***', puzzleId);
    }
    if (feedback) {
      segments.push('***PAGE***', feedback);
    }
  }

  return matched ? segments : null;
}

/**
 * Parse lesson markdown into segments shaped like
 * `text.split(/(\*\*\*PAGE\*\*\*|\*\*\*PUZZLE\*\*\*)/)`.
 * Supports legacy markers and content-team package format without rewriting files.
 */
export function parseLessonMarkdown(markdown: string | null | undefined): LessonSegment[] {
  const text = typeof markdown === 'string' ? markdown : '';
  if (!text.trim()) {
    return emptyPageSegments();
  }

  if (LEGACY_MARKER_RE.test(text)) {
    const segments = text.split(/(\*\*\*PAGE\*\*\*|\*\*\*PUZZLE\*\*\*)/);
    if (lessonStepCount(segments) > 0) {
      return segments;
    }
    return emptyPageSegments();
  }

  const packaged = parsePackageFormat(text);
  if (packaged && lessonStepCount(packaged) > 0) {
    return packaged;
  }

  // Unknown markdown: still show a single PAGE so the UI never blanks.
  return emptyPageSegments(text.trim());
}

export default parseLessonMarkdown;
