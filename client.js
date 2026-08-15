// dsh-codex-side-outline — browser (client) half.
//
// Renders a hoverable + clickable rail along the LEFT EDGE of the center
// (conversation) column, adjacent to the sidebar: one gray short line per
// conversation turn, stacked top-to-bottom.
//
// - Hover a line: it highlights and shows a summary card (first line = user
//   question; up to 3 lines of ~20 chars = the agent's final reply only).
// - Click a line: the conversation scrolls to that turn's user message.
//
// Placement: `shell.overlay` (frame-wide floating layer). The rail's
// horizontal offset is measured from the frame's first grid column (the
// sidebar) at runtime, so it tracks sidebar drag / collapse / window-resize.
// Conversation data comes from the client `sessions` service: `useSessions`
// yields the current session id, and `sessions.binding(id).session` exposes an
// ObservableSnapshot whose `getSnapshot().nodes` carries the folded
// ConversationNode list.

import * as React from 'react'

const PER = 20
const GAP = 6

function textOfBlocks(blocks) {
  if (!blocks) return ''
  const parts = []
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    if (b && b.type === 'text' && typeof b.text === 'string') parts.push(b.text)
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

function textOfAssistant(node) {
  if (!node || !node.blocks) return ''
  const parts = []
  for (let i = 0; i < node.blocks.length; i++) {
    const b = node.blocks[i]
    if (b && b.kind === 'text' && typeof b.text === 'string') parts.push(b.text)
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

function chatKeyBySeq(snapshot) {
  const map = new Map()
  const store = snapshot && snapshot.chat && snapshot.chat.nodes
  if (store && typeof store.values === 'function') {
    const values = store.values()
    for (let i = 0; i < values.length; i++) {
      const n = values[i]
      if (n && typeof n.anchorSeq === 'number' && typeof n.key === 'string' && !map.has(n.anchorSeq)) {
        map.set(n.anchorSeq, n.key)
      }
    }
  }
  return map
}

function buildTurns(snapshot) {
  const keyBySeq = chatKeyBySeq(snapshot)
  const nodes = snapshot && snapshot.nodes ? snapshot.nodes : []
  const turns = []
  let current = null
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    if (!n) continue
    if (n.kind === 'user') {
      current = { question: textOfBlocks(n.content), reply: '', key: keyBySeq.get(n.seq) || '' }
      turns.push(current)
    } else if (n.kind === 'assistant') {
      const text = textOfAssistant(n)
      if (!text) continue
      if (!current) {
        current = { question: '', reply: text, key: keyBySeq.get(n.seq) || '' }
        turns.push(current)
      } else {
        // Keep only the final reply of the turn, not intermediate narration before tool calls.
        current.reply = text
      }
    }
  }
  return turns.filter((t) => t.question || t.reply)
}

function clampLines(text, perLine, maxLines) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  if (!clean) return []
  const total = perLine * maxLines
  const limited = clean.length > total ? clean.slice(0, total - 1) + '\u2026' : clean
  const lines = []
  for (let i = 0; i < limited.length; i += perLine) lines.push(limited.slice(i, i + perLine))
  return lines
}

function scrollToKey(key) {
  if (!key || typeof document === 'undefined') return false
  let row = null
  const all = document.querySelectorAll('[data-chat-anchor-key]')
  for (let i = 0; i < all.length; i++) {
    if (all[i].getAttribute('data-chat-anchor-key') === key) { row = all[i]; break }
  }
  if (!row) return false
  const scrollport = typeof row.closest === 'function' ? row.closest('[data-conversation-scroll]') : null
  if (scrollport) {
    const top = row.getBoundingClientRect().top - scrollport.getBoundingClientRect().top
    scrollport.scrollTop += top - 24
  } else if (typeof row.scrollIntoView === 'function') {
    row.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
  return true
}

const css = [
  '.dso-outline-rail{position:absolute;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;align-items:flex-start;gap:7px;z-index:9990;pointer-events:auto;}',
  '.dso-outline-item{position:relative;display:flex;align-items:center;padding:2px 0;cursor:pointer;}',
  '.dso-outline-line{width:26px;height:3px;border-radius:2px;background:var(--dsw-alias-label-secondary);opacity:.45;transition:width .12s ease,opacity .12s ease,background .12s ease;}',
  '.dso-outline-item:hover .dso-outline-line,.dso-outline-item.is-hover .dso-outline-line{width:42px;height:4px;opacity:1;background:var(--dsw-alias-brand-primary);}',
  '.dso-outline-card{position:absolute;left:50px;top:50%;transform:translateY(-50%);min-width:150px;max-width:190px;padding:8px 10px;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.22);z-index:9991;font-size:12px;line-height:1.5;}',
  '.dso-outline-q{color:var(--dsw-alias-label-primary);font-weight:600;border-left:2px solid var(--dsw-alias-brand-primary);padding-left:6px;margin-bottom:4px;word-break:break-all;}',
  '.dso-outline-a{color:var(--dsw-alias-label-secondary);padding-left:8px;word-break:break-all;}'
].join('\n')

export const inject = ['slots', 'sessions']

export function apply(ctx) {
  const timer = ctx.get('timer')

  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.plugin = 'dsh-codex-side-outline'
    style.textContent = css
    document.head.appendChild(style)
    return () => style.remove()
  })

  function Card(props) {
    const children = []
    const q = clampLines(props.turn.question, PER, 1)
    if (q.length) children.push(React.createElement('div', { key: 'q', className: 'dso-outline-q' }, q[0]))
    const a = clampLines(props.turn.reply, PER, 3)
    for (let i = 0; i < a.length; i++) {
      children.push(React.createElement('div', { key: 'a' + i, className: 'dso-outline-a' }, a[i]))
    }
    return React.createElement('div', { className: 'dso-outline-card' }, children)
  }

  function Outline(props) {
    const currentId = props.useSessions((s) => s.current)
    const [turns, setTurns] = React.useState([])
    const [hover, setHover] = React.useState(-1)
    const [left, setLeft] = React.useState(286)
    const railRef = React.useRef(null)
    const hasTurns = turns.length > 0

    React.useEffect(() => {
      if (!currentId) {
        setTurns([])
        return
      }
      let binding
      try {
        binding = ctx.sessions.binding(currentId)
      } catch (e) {
        setTurns([])
        return
      }
      if (!binding || !binding.session) {
        setTurns([])
        return
      }
      const face = binding.session
      const read = () => setTurns(buildTurns(face.getSnapshot()))
      read()
      return face.subscribe(read)
    }, [currentId])

    React.useEffect(() => {
      if (!hasTurns) return
      const measure = () => {
        const el = railRef.current
        if (!el) return
        const frame = el.parentElement && el.parentElement.parentElement
        if (!frame) return
        let w = 0
        const col = frame.firstElementChild
        if (col && typeof col.getBoundingClientRect === 'function') {
          w = col.getBoundingClientRect().width
        }
        if (!w && frame.style && frame.style.gridTemplateColumns) {
          w = parseFloat(frame.style.gridTemplateColumns) || 0
        }
        if (w > 0) setLeft((prev) => (prev === w + GAP ? prev : w + GAP))
      }
      measure()
      let dispose
      if (timer && typeof timer.interval === 'function') {
        dispose = timer.interval(measure, 350)
      }
      return () => { if (dispose) dispose() }
    }, [hasTurns])

    if (!hasTurns) return null

    const items = turns.map((t, i) => React.createElement('div', {
      key: i,
      className: 'dso-outline-item' + (i === hover ? ' is-hover' : ''),
      onMouseEnter: () => setHover(i),
      onMouseLeave: () => setHover(-1),
      onClick: () => scrollToKey(t.key),
    },
      React.createElement('div', { className: 'dso-outline-line' }),
      i === hover ? React.createElement(Card, { turn: t }) : null,
    ))

    return React.createElement('div', { ref: railRef, className: 'dso-outline-rail', style: { left: left + 'px' } }, items)
  }

  ctx.slots.inject('shell.overlay', () => ctx.slots.register(
    { name: 'shell.overlay', id: 'codex-side-outline', order: 0 },
    (props) => React.createElement(Outline, { useSessions: props.useSessions }),
  ))
}
