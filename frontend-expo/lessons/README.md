# Writing a lesson

Each lesson is one file: `lessonN.md` (lesson1.md, lesson2.md, ...).

## 1. Header (top of the file)

The header sets what kids see on the Lessons page card.

```md
---
title: Hanging Pieces
description: Spot pieces you can capture for free!
icon: default
---
```

- `title` – the card name. Keep it short.
- `description` – one sentence shown when the card is tapped.
- `icon` – leave as `default` for now.

The `---` must be the very first line. Each field is optional. With no title, the
card uses the first line of the file; with no description, it shows none.

## 2. Pages and puzzles

After the header, split the lesson into steps:

```md
***PAGE***

# Normal markdown here

***PUZZLE***
<puzzle id>
```

- `***PAGE***` – a page of text (any markdown).
- `***PUZZLE***` – followed by a puzzle id on the next line.

## 3. Adding a new lesson

1. Create `lessonN.md` in this folder.
2. Add one line to `components/lessons/Lessons.tsx`:
   `lessonN: require('@/lessons/lessonN.md'),`
