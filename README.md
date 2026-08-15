# dsh-codex-side-outline

A Codex-style side outline for the DeepSeek Harness chat column. It extracts an
outline of the current conversation and shows it as a thin rail along the left
edge of the center (conversation) column, adjacent to the sidebar.

- **Gray short lines** — one line per conversation turn, stacked top-to-bottom.
  The hovered turn is the longest and lengths step down in both directions
  (5 levels), so the rail reads like a minimap.
- **Hover to inspect** — a summary card shows:
  - first line = the user question (bold, brand accent bar);
  - following lines = the agent's **final** reply only (thinking/chain-of-thought
    and intermediate narration before tool calls are excluded).
- **Click to jump** — clicking a line scrolls the conversation to that turn's
  user message.
- **Pager** — long conversations get ▲/▼ buttons to scroll the rail.
- **Auto-hides** on the trajectory view, and **follows the sidebar** in real
  time as you drag or collapse it.

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

Install into the **default `web` profile** with the `dsh` CLI (from a directory
containing this package):

```sh
dsh plugin --profile web add ./dsh-codex-side-outline
```

Or install straight from a git host:

```sh
dsh plugin --profile web add github:you/dsh-codex-side-outline
```

Verify the layer, then boot:

```sh
dsh --profile web --dump-config   # shows a "# == dsh-codex-side-outline" layer
dsh web
```

> ⚠️ **Restart required.** The web app composes its client bundle roster at
> boot. After `dsh plugin add` — or after editing this plugin's code — stop the
> running `dsh web` process and start it again. A page refresh alone is **not**
> enough for a newly added or updated bundle to load.

## How it works

- **Slot:** `shell.overlay` (frame-wide floating layer). This keeps the rail
  outside every column's scroll container. The rail's horizontal offset is read
  from the frame's inline `grid-template-columns` via a `ResizeObserver`, so it
  tracks sidebar drag / collapse / window-resize with zero-frame lag.
- **Data:** read from the client `sessions` service (not the Host):
  - `useSessions((s) => s.current)` (standard prop of `shell.overlay`) yields
    the current session id;
  - `sessions.binding(id).session` exposes an `ObservableSnapshot` whose
    `getSnapshot().nodes` carries the folded `ConversationNode[]`;
  - `user` nodes contribute the question text (`content` text blocks), and
    `assistant` nodes contribute the reply text (`blocks` of `kind: 'text'`).
  - Folded/older history is auto-loaded via `session.loadOlder()` so the rail
    shows every turn without a manual "load more".
- **Jump:** each turn's `seq` is mapped to the chat node key via
  `snapshot.chat.nodes.values()` (`anchorSeq` → `key`); clicking scrolls the
  row carrying `data-chat-anchor-key` inside the `[data-conversation-scroll]`
  scrollport.
- **Trajectory:** the rail hides while `[data-trajectory-scroll]` is present in
  the DOM (i.e. the trajectory view is the active conversation view).
- **Styling:** a package-local `<style>` tag colored with theme CSS variables
  (`--dsw-alias-*`), so light/dark modes follow the active theme.
