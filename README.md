# conversation-outline

A dynamic Cordis Plugin (Client half) for the DeepSeek Harness Web GUI that
extracts an outline of the current conversation and shows it as a thin rail on
the left edge of the window.

- **Gray short lines on the left** — one line per conversation turn (a user
  question plus the agent reply that follows it), stacked top-to-bottom.
- **Hover to inspect** — hovering a line highlights it (longer, thicker, brand
  colored) and opens a summary card:
  - first line = the user question (bold, brand accent bar);
  - following lines = the agent reply, wrapped to about 3 lines of ~20
    characters each (older content is ellipsized).

## How it works

- **Slot:** `shell.overlay` (frame-wide floating layer). This keeps the
  `position: fixed` rail outside every column's scroll container, and entries
  opt back into pointer events.
- **Data:** read from the client `sessions` service, not from the Host:
  - `useSessions((s) => s.current)` (standard prop of `shell.overlay`) yields
    the current session id;
  - `sessions.binding(id).session` exposes an `ObservableSnapshot` whose
    `getSnapshot().nodes` carries the folded `ConversationNode[]`;
  - `user` nodes contribute the question text (`content` text blocks), and
    `assistant` nodes contribute the reply text (`blocks` of `kind: 'text'`).
- **Styling:** package-local CSS via `styles.insert`, colored with theme CSS
  variables (`--dsw-alias-*`), so light/dark modes follow the active theme.

## Files

- `src/conversation-outline.client.js` — the `code.client` function body for
  the dynamic Plugin.

## Loading

This Plugin is registered as a dynamic Cordis Plugin for the running harness
(process-local, not a shipped preset). To activate it in this session, define
and run the package via the Cordis tooling, or paste the body in
`src/conversation-outline.client.js` as the `code.client` payload of
`cordis_define`.
