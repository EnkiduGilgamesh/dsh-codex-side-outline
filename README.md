# dsh-codex-side-outline

A Codex-style side outline for the DeepSeek Harness chat column. It extracts an
outline of the current conversation and shows it as a thin rail along the left
edge of the center (conversation) column, adjacent to the sidebar.

- **Gray short lines** — one line per conversation turn (a user question plus
  the agent reply that follows it), stacked top-to-bottom.
- **Hover to inspect** — hovering a line highlights it (longer, thicker, brand
  colored) and opens a summary card:
  - first line = the user question (bold, brand accent bar);
  - following lines = the agent's **final** reply only (thinking/chain-of-thought
    and intermediate narration before tool calls are excluded), wrapped to
    about 3 lines of ~20 characters each (older content is ellipsized).
- **Click to jump** — clicking a line scrolls the conversation to that turn's
  user message.

## Package layout

This is an installable **bundle** (`dsh.bundle`) that also ships a **browser
(client) half** (`dsh.client`), following the
[official plugin guide](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/).

| File | Purpose |
| --- | --- |
| `package.json` | Bundle + client manifests (`dsh.bundle.patch`, `dsh.client`). |
| `cordis.patch.yml` | The layer applied when a profile lists this bundle. |
| `index.js` | Host half — a no-op entry (browser-only plugin). |
| `client.js` | Browser half — the outline rail UI. |

`src/conversation-outline.client.js` is a retained reference copy of the
original process-local dynamic plugin, kept for provenance; it is not shipped
in the npm package.

## Install

Install into a profile with the `dsh` CLI (from a directory containing this
package):

```sh
dsh plugin --profile demo add ./dsh-codex-side-outline
```

Or install straight from a git host:

```sh
dsh plugin --profile demo add github:you/dsh-codex-side-outline
```

Then boot:

```sh
dsh --profile demo --dump-config   # shows a "# == dsh-codex-side-outline" layer
dsh --profile demo
```

## How it works

- **Slot:** `shell.overlay` (frame-wide floating layer). This keeps the
  rail outside every column's scroll container. The rail's horizontal offset is
  measured at runtime from the frame's first grid column (the sidebar width), so
  it tracks sidebar drag / collapse / window-resize.
- **Data:** read from the client `sessions` service (not the Host):
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
- **Styling:** a package-local `<style>` tag colored with theme CSS variables
  (`--dsw-alias-*`), so light/dark modes follow the active theme.
