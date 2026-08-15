// dsh-codex-side-outline — browser (client) half, in the client-modules
// bundle format. Registered via window.__ModuleLoader__.load so the web shell
// can import this package's `./client` entry.
window.__ModuleLoader__.load({
  id: "dsh-codex-side-outline",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");

    const PER = 26
    const GAP = 6
    const WIDTHS = [40, 33, 26, 20, 14]
    const ITEM_H = 14
    const BTN_H = 20

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
      '.dso-outline-rail{position:absolute;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;align-items:flex-start;z-index:9990;pointer-events:auto;}',
      '.dso-outline-list{display:flex;flex-direction:column;overflow-y:auto;scrollbar-width:none;max-height:min(60vh,420px);}',
      '.dso-outline-list::-webkit-scrollbar{display:none;}',
      '.dso-outline-item{position:relative;display:flex;align-items:center;height:' + ITEM_H + 'px;cursor:pointer;}',
      '.dso-outline-line{height:4px;border-radius:2px;background:var(--dsw-alias-label-secondary);opacity:.45;transition:width .18s cubic-bezier(.2,.8,.2,1),background-color .18s ease,opacity .18s ease;}',
      '.dso-outline-btn{width:24px;height:' + BTN_H + 'px;margin:0;padding:0;border:none;background:transparent;color:var(--dsw-alias-label-secondary);opacity:.7;cursor:pointer;font-size:11px;line-height:1;display:flex;align-items:center;justify-content:flex-start;transition:opacity .12s ease;}',
      '.dso-outline-btn:hover{opacity:1;}',
      '.dso-outline-btn:disabled{opacity:.2;cursor:default;}',
      '.dso-outline-card{position:absolute;left:52px;transform:translateY(-50%);min-width:225px;max-width:285px;padding:8px 12px;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.22);z-index:9991;font-size:12px;line-height:1.5;pointer-events:none;}',
      '.dso-outline-q{color:var(--dsw-alias-label-primary);font-weight:600;border-left:2px solid var(--dsw-alias-brand-primary);padding-left:6px;margin-bottom:4px;word-break:break-all;}',
      '.dso-outline-a{color:var(--dsw-alias-label-secondary);padding-left:8px;word-break:break-all;}'
    ].join('\n')

    const inject = ['slots', 'sessions']

    function apply(ctx) {
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
        return React.createElement('div', { className: 'dso-outline-card', style: { top: props.top + 'px' } }, children)
      }

      function Outline(props) {
        const currentId = props.useSessions((s) => s.current)
        const [turns, setTurns] = React.useState([])
        const [hover, setHover] = React.useState(-1)
        const [left, setLeft] = React.useState(286)
        const [overflow, setOverflow] = React.useState(false)
        const [scroll, setScroll] = React.useState({ top: 0, atTop: true, atBottom: false })
        const [isTrajectory, setIsTrajectory] = React.useState(false)
        const railRef = React.useRef(null)
        const listRef = React.useRef(null)
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
          let loadCount = 0
          const read = () => {
            const snap = face.getSnapshot()
            setTurns(buildTurns(snap))
            // Auto-load folded/older history: trigger one page per snapshot flush
            // while the session is open and more history remains. Waiting for the
            // open state avoids the fire-once race that ran before the window opened.
            if (snap.openState === 'open' && snap.hasMore && !snap.loadingOlder && loadCount < 50) {
              loadCount++
              face.loadOlder().catch(() => {})
            }
          }
          read()
          return face.subscribe(read)
        }, [currentId])

        React.useEffect(() => {
          if (!hasTurns) return

          const check = () => {
            if (typeof document === 'undefined') return
            // Find the frame through the stable overlay-layer marker (independent
            // of any slot wrapper around this rail), then read the sidebar track
            // width from the frame's inline grid-template-columns.
            const overlay = document.querySelector('[data-shell-overlay]')
            const frame = overlay && overlay.parentElement
            if (frame) {
              let w = 0
              if (frame.style && frame.style.gridTemplateColumns) {
                w = parseFloat(frame.style.gridTemplateColumns) || 0
              }
              if (!w) {
                const col = frame.firstElementChild
                if (col && typeof col.getBoundingClientRect === 'function') {
                  w = col.getBoundingClientRect().width
                }
              }
              if (w > 0) setLeft((prev) => (prev === w + GAP ? prev : w + GAP))
            }
            // Hide the rail while the trajectory view is the active conversation view.
            const traj = !!document.querySelector('[data-trajectory-scroll]')
            setIsTrajectory((prev) => (prev === traj ? prev : traj))
          }

          check()

          const id = setInterval(check, 250)

          return () => {
            clearInterval(id)
          }
        }, [hasTurns])

        React.useEffect(() => {
          const el = listRef.current
          if (el) setOverflow(el.scrollHeight > el.clientHeight)
        }, [turns])

        if (!hasTurns || isTrajectory) return null

        const handleScroll = () => {
          const el = listRef.current
          if (!el) return
          setScroll({
            top: el.scrollTop,
            atTop: el.scrollTop <= 0,
            atBottom: el.scrollTop + el.clientHeight >= el.scrollHeight - 1,
          })
        }

        const page = (dir) => {
          const el = listRef.current
          if (el) el.scrollBy({ top: dir * el.clientHeight * 0.9, behavior: 'smooth' })
        }

        const items = turns.map((t, i) => {
          const level = hover < 0 ? WIDTHS.length - 1 : Math.min(Math.abs(i - hover), WIDTHS.length - 1)
          const isHover = i === hover
          return React.createElement('div', {
            key: i,
            className: 'dso-outline-item',
            onMouseEnter: () => setHover(i),
            onClick: () => scrollToKey(t.key),
          },
            React.createElement('div', {
              className: 'dso-outline-line',
              style: {
                width: WIDTHS[level] + 'px',
                background: isHover ? 'var(--dsw-alias-brand-primary)' : undefined,
                opacity: isHover ? 1 : undefined,
              },
            }),
          )
        })

        const topButton = overflow ? React.createElement('button', {
          className: 'dso-outline-btn',
          disabled: scroll.atTop,
          onMouseEnter: () => setHover(-1),
          onClick: () => page(-1),
        }, '\u25B2') : null

        const bottomButton = overflow ? React.createElement('button', {
          className: 'dso-outline-btn',
          disabled: scroll.atBottom,
          onMouseEnter: () => setHover(-1),
          onClick: () => page(1),
        }, '\u25BC') : null

        const cardTop = hover >= 0
          ? (overflow ? BTN_H : 0) + hover * ITEM_H + ITEM_H / 2 - scroll.top
          : 0

        return React.createElement('div', {
          ref: railRef,
          className: 'dso-outline-rail',
          style: { left: left + 'px' },
          onMouseLeave: () => setHover(-1),
        },
          topButton,
          React.createElement('div', { ref: listRef, className: 'dso-outline-list', onScroll: handleScroll }, items),
          bottomButton,
          hover >= 0 ? React.createElement(Card, { turn: turns[hover], top: cardTop }) : null,
        )
      }

      ctx.slots.inject('shell.overlay', () => ctx.slots.register(
        { name: 'shell.overlay', id: 'codex-side-outline', order: 0 },
        (props) => React.createElement(Outline, { useSessions: props.useSessions }),
      ))
    }

    exports.inject = inject;
    exports.apply = apply;
    return module.exports;
  }
});
