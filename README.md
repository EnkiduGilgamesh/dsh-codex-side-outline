# conversation-outline

A dynamic Cordis Plugin (Client half) for the DeepSeek Harness Web GUI that
extracts an outline of the current conversation and shows it as a thin rail
along the left edge of the center (conversation) column, adjacent to the
sidebar.

- **Gray short lines on the left of the conversation column** — one line per
  conversation turn (a user question plus the agent reply that follows it),
  stacked top-to-bottom.
- **Hover to inspect** — hovering a line highlights it (longer, thicker, brand
  colored) and opens a summary card:
  - first line = the user question (bold, brand accent bar);
  - following lines = the agent's **final** reply only (thinking/chain-of-thought
    and intermediate narration before tool calls are excluded), wrapped to
    about 3 lines of ~20 characters each (older content is ellipsized).
- **Click to jump** — clicking a line scrolls the conversation to that turn's
  user message.

## How it works

- **Slot:** `shell.overlay` (frame-wide floating layer). This keeps the
  rail outside every column's scroll container, and entries opt back into
  pointer events. The rail's horizontal offset is measured at runtime from the
  frame's first grid column (the sidebar width), so it tracks sidebar drag /
  collapse / window-resize and sits just inside the conversation column.
- **Data:** read from the client `sessions` service, not from the Host:
  - `useSessions((s) => s.current)` (standard prop of `shell.overlay`) yields
    the current session id;
  - `sessions.binding(id).session` exposes an `ObservableSnapshot` whose
    `getSnapshot().nodes` carries the folded `ConversationNode[]`;
  - `user` nodes contribute the question text (`content` text blocks), and
    `assistant` nodes contribute the reply text (`blocks` of `kind: 'text'`).
- **Jump:** each turn's `seq` is mapped to the chat node key via
  `snapshot.chat.nodes.values()` (`anchorSeq` → `key`); clicking scrolls the
  row carrying `data-chat-anchor-key` inside the `[data-conversation-scroll]`
  scrollport.
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
