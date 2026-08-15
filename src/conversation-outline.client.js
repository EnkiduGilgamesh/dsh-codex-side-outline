// conversation-outline — Dynamic Cordis Plugin (Client half)
//
// This file is the `code.client` function body for the `outln-*` Plugin. It
// renders a hoverable left rail over the current session: one gray short line
// per conversation turn, stacked top-to-bottom. Hovering a line highlights it
// and reveals a summary card whose first line is the user question and whose
// remaining lines (up to 3, ~20 characters each) are the agent reply.
//
// Placement: `shell.overlay` (frame-wide floating layer) so `position: fixed`
// stays outside every column's scroll container. Conversation data is read
// through the `sessions` service: `useSessions` yields the current session id,
// `sessions.binding(id).session` exposes an ObservableSnapshot whose
// `getSnapshot().nodes` carries the folded ConversationNode list.

const PER = 20

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

function buildTurns(snapshot) {
  const nodes = snapshot && snapshot.nodes ? snapshot.nodes : []
  const turns = []
  let current = null
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    if (!n) continue
    if (n.kind === 'user') {
      current = { question: textOfBlocks(n.content), reply: '' }
      turns.push(current)
    } else if (n.kind === 'assistant') {
      const text = textOfAssistant(n)
      if (!text) continue
      if (!current) {
        current = { question: '', reply: text }
        turns.push(current)
      } else {
        current.reply = current.reply ? current.reply + ' ' + text : text
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

const css = [
  '.dso-outline-rail{position:fixed;left:6px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;align-items:flex-start;gap:7px;z-index:9990;pointer-events:auto;}',
  '.dso-outline-item{position:relative;display:flex;align-items:center;padding:2px 0;}',
  '.dso-outline-line{width:26px;height:3px;border-radius:2px;background:var(--dsw-alias-label-secondary);opacity:.45;transition:width .12s ease,opacity .12s ease,background .12s ease;}',
  '.dso-outline-item.is-hover .dso-outline-line{width:42px;height:4px;opacity:1;background:var(--dsw-alias-brand-primary);}',
  '.dso-outline-card{position:absolute;left:50px;top:50%;transform:translateY(-50%);min-width:150px;max-width:190px;padding:8px 10px;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.22);z-index:9991;font-size:12px;line-height:1.5;}',
  '.dso-outline-q{color:var(--dsw-alias-label-primary);font-weight:600;border-left:2px solid var(--dsw-alias-brand-primary);padding-left:6px;margin-bottom:4px;word-break:break-all;}',
  '.dso-outline-a{color:var(--dsw-alias-label-secondary);padding-left:8px;word-break:break-all;}'
].join('\n')

return {
  apply(ctx) {
    const slots = ctx.get('slots')
    if (slots === undefined) return
    const sessionsSvc = ctx.get('sessions')

    styles.insert(css)

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

      React.useEffect(() => {
        if (!currentId || !sessionsSvc) {
          setTurns([])
          return
        }
        let binding
        try {
          binding = sessionsSvc.binding(currentId)
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

      if (!turns.length) return null

      const items = turns.map((t, i) => React.createElement('div', {
        key: i,
        className: 'dso-outline-item' + (i === hover ? ' is-hover' : ''),
        onMouseEnter: () => setHover(i),
        onMouseLeave: () => setHover(-1),
      },
        React.createElement('div', { className: 'dso-outline-line' }),
        i === hover ? React.createElement(Card, { turn: t }) : null,
      ))

      return React.createElement('div', { className: 'dso-outline-rail' }, items)
    }

    slots.inject('shell.overlay', () => slots.register(
      { name: 'shell.overlay', id: 'conversation-outline', order: 0 },
      (props) => React.createElement(Outline, { useSessions: props.useSessions }),
    ))
  },
}
