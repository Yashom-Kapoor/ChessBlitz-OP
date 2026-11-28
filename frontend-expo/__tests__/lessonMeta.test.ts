import { parseLesson } from '@/utils/lessonMeta';

describe('parseLesson', () => {
  it('reads title and description from the header', () => {
    const text = '---\ntitle: The Pieces\ndescription: Meet the pieces!\n---\nSTART LESSON 1\n\n***PAGE***\n# Hi';
    const lesson = parseLesson(text, 1);
    expect(lesson).toEqual({ id: 1, title: 'The Pieces', description: 'Meet the pieces!', body: 'START LESSON 1\n\n***PAGE***\n# Hi' });
  });

  it('ignores unknown header fields', () => {
    const lesson = parseLesson('---\ntitle: T\nicon: knight\n---\nbody', 1);
    expect(lesson).toEqual({ id: 1, title: 'T', description: '', body: 'body' });
  });

  it('keeps colons inside values', () => {
    expect(parseLesson('---\ntitle: Forks: Double Trouble\n---\nx', 3).title).toBe('Forks: Double Trouble');
  });

  it('falls back to the first line as title with no description', () => {
    const lesson = parseLesson('\nSTART LESSON 4\n\n***PAGE***\n', 4);
    expect(lesson).toMatchObject({ title: 'START LESSON 4', description: '' });
    expect(lesson.body).toBe('\nSTART LESSON 4\n\n***PAGE***\n');
  });

  it('strips markdown heading marks from the fallback title', () => {
    expect(parseLesson('# Hanging Pieces\nmore', 2).title).toBe('Hanging Pieces');
  });

  it('uses the first line when the header has no title', () => {
    expect(parseLesson('---\ndescription: hi\n---\nSTART LESSON 5', 5)).toMatchObject({ title: 'START LESSON 5', description: 'hi' });
  });

  it('names an empty file "Lesson N"', () => {
    expect(parseLesson('', 8)).toMatchObject({ title: 'Lesson 8', description: '', body: '' });
  });

  it('handles Windows line endings', () => {
    expect(parseLesson('---\r\ntitle: Win\r\n---\r\nbody', 1)).toMatchObject({ title: 'Win', body: 'body' });
  });
});
