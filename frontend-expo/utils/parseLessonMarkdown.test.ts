import { lessonStepCount, parseLessonMarkdown } from './parseLessonMarkdown';

describe('parseLessonMarkdown', () => {
  it('parses content-team package format into PAGE/PUZZLE segments', () => {
    const md = `# Skewer — Introduction

## Instruction

Look at the king.

**PUZZLE**

7f4E0

## Feedback

Nice!

# Skewer — Explanation

## Instruction

This is a skewer.

**PUZZLE**

5nE8H

## Feedback

Yes!

# Skewer — Challenge

## Instruction

Ultimate test.

**PUZZLE**

2ASam

## Feedback

Great job!
`;

    const segments = parseLessonMarkdown(md);
    expect(lessonStepCount(segments)).toBeGreaterThan(0);

    const puzzleIds: string[] = [];
    for (let i = 1; i < segments.length; i += 2) {
      if (segments[i] === '***PUZZLE***') {
        puzzleIds.push(segments[i + 1].trim());
      }
    }
    expect(puzzleIds).toEqual(['7f4E0', '5nE8H', '2ASam']);
    expect(segments[1]).toBe('***PAGE***');
  });

  it('parses legacy ***PAGE***/***PUZZLE*** markers unchanged', () => {
    const md = `START

***PAGE***

# Lesson

hello

***PUZZLE***

00rHa

***PAGE***

done
`;

    const segments = parseLessonMarkdown(md);
    expect(segments).toEqual(md.split(/(\*\*\*PAGE\*\*\*|\*\*\*PUZZLE\*\*\*)/));
    expect(lessonStepCount(segments)).toBe(3);
  });

  it('produces at least one PAGE for empty or unknown markdown', () => {
    const empty = parseLessonMarkdown('');
    expect(empty[1]).toBe('***PAGE***');
    expect(lessonStepCount(empty)).toBe(1);

    const unknown = parseLessonMarkdown('just some text without structure');
    expect(unknown[1]).toBe('***PAGE***');
    expect(lessonStepCount(unknown)).toBe(1);
  });
});
