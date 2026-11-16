import React from 'react'

// Safe Markdown renderer: produces React elements only (never dangerouslySetInnerHTML)
// so any user/admin content is escaped by React automatically.
export function SafeMarkdown({ content }) {
  if (!content || typeof content !== 'string') return null
  const blocks = content.replace(/\r\n/g, '\n').split(/\n{2,}/)

  return (
    <div className="space-y-4 text-gray-700 leading-relaxed text-sm sm:text-base">
      {blocks.map((raw, idx) => {
        const block = raw.trim()
        if (!block) return null
        if (block.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-lg font-bold text-navy-950 pt-2">
              {block.slice(4)}
            </h3>
          )
        }
        if (block.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-xl font-bold text-navy-950 pt-3">
              {block.slice(3)}
            </h2>
          )
        }
        if (block.startsWith('# ')) {
          return (
            <h1 key={idx} className="text-2xl font-extrabold text-navy-950 pt-4">
              {block.slice(2)}
            </h1>
          )
        }
        const lines = block.split('\n')
        if (lines.every((l) => /^[-*]\s+/.test(l.trim()))) {
          return (
            <ul key={idx} className="list-disc pl-6 space-y-1.5">
              {lines.map((l, i) => (
                <li key={i}>{l.trim().replace(/^[-*]\s+/, '')}</li>
              ))}
            </ul>
          )
        }
        return (
          <p key={idx} className="whitespace-pre-line">
            {block}
          </p>
        )
      })}
    </div>
  )
}
