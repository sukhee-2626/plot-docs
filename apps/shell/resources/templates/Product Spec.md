# Product Specification — Workspace 2.0

**Status:** Draft for review  
**Owner:** Product  
**Last updated:** 21 October 2026

> [!NOTE]
> This template uses the Plot Docs Markdown conventions. Keep the summary short; the details belong under the sections below.

## 1. Summary

Workspace 2.0 gives a team one calm place to start, draft and finish work. It brings templates, recent files and in-file AI into a single surface while keeping every file local-first.

## 2. Problem

Teams switch between a documents tool, a spreadsheet, a deck editor and an AI chat window. The context never travels with the work, so the first ten minutes of every task are spent finding the right place to begin.

## 3. Goals

- Make the first useful action obvious from the home screen.
- Let AI work on the actual document, not a copy in a chat window.
- Give every common task a credible starting point.
- Keep files portable and useful outside Plot Docs.

### Non-goals

- Replacing a full project-management suite.
- Real-time multiplayer in the first release.
- A public template marketplace.

## 4. User stories

| As a… | I want… | So that… |
| --- | --- | --- |
| New user | to start from a template | I do not face a blank page |
| Returning user | to see my recent files | I can resume in one click |
| Team lead | to ask AI about my starred files | answers include sources I can open |
| Designer | to adjust a template in the editor | the result still feels like my work |

## 5. Requirements

### Must have

1. A template gallery grouped by document type.
2. Templates open as editable copies, never as read-only samples.
3. AI actions appear inside Docs, Sheets, Slides, Markdown and HTML.
4. The app remembers the last save folder per format.

### Should have

1. A command palette for creating and opening files.
2. Recently used templates on the home screen.
3. A clear empty state for every editor.

## 6. Success metrics

- **Activation:** 60% of new users open a template in their first session.
- **Time to first save:** under 4 minutes.
- **Repeat use:** 35% of activated users return within 7 days.
- **AI trust:** 70% of AI-assisted files keep at least one AI edit.

## 7. Launch plan

| Phase | Date | Exit criteria |
| --- | --- | --- |
| Internal beta | 28 Oct | All templates open and save |
| Design QA | 4 Nov | No truncation at 720px width |
| Public beta | 11 Nov | Activation baseline recorded |
| General availability | 25 Nov | Support playbook published |

## 8. Open questions

- Should templates carry a “sample content” banner until first save?
- Which three templates deserve a home-screen shortcut?
- How do we measure trust without adding friction?
