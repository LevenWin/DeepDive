import { marked } from 'marked'
import katex from 'katex'
import hljs from 'highlight.js/lib/core'

import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import java from 'highlight.js/lib/languages/java'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import bash from 'highlight.js/lib/languages/bash'
import sql from 'highlight.js/lib/languages/sql'
import html from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import json from 'highlight.js/lib/languages/json'
import yaml from 'highlight.js/lib/languages/yaml'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import php from 'highlight.js/lib/languages/php'
import ruby from 'highlight.js/lib/languages/ruby'
import swift from 'highlight.js/lib/languages/swift'
import kotlin from 'highlight.js/lib/languages/kotlin'
import markdownLang from 'highlight.js/lib/languages/markdown'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import plaintext from 'highlight.js/lib/languages/plaintext'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('py', python)
hljs.registerLanguage('java', java)
hljs.registerLanguage('go', go)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('shell', bash)
hljs.registerLanguage('sh', bash)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('html', html)
hljs.registerLanguage('xml', html)
hljs.registerLanguage('css', css)
hljs.registerLanguage('json', json)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('yml', yaml)
hljs.registerLanguage('c', c)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('c++', cpp)
hljs.registerLanguage('php', php)
hljs.registerLanguage('ruby', ruby)
hljs.registerLanguage('rb', ruby)
hljs.registerLanguage('swift', swift)
hljs.registerLanguage('kotlin', kotlin)
hljs.registerLanguage('kt', kotlin)
hljs.registerLanguage('markdown', markdownLang)
hljs.registerLanguage('md', markdownLang)
hljs.registerLanguage('dockerfile', dockerfile)
hljs.registerLanguage('plaintext', plaintext)
hljs.registerLanguage('text', plaintext)

marked.use({
  renderer: {
    code({ text, lang }) {
      const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
      const highlighted = hljs.highlight(text, { language }).value
      return `<pre><code class="hljs language-${lang || 'plaintext'}">${highlighted}</code></pre>`
    },
  },
})

export function renderMarkdown(content, relatedConcepts = []) {
  if (!content) return ''

  let html
  try {
    html = marked.parse(content)
    if (content.includes('##') && !html.includes('<h2')) {
      console.warn('[markdown] ## found in content but <h2> not in output, checking...')
      console.log('[markdown] raw content first 300 chars:', content.slice(0, 300))
    }
  } catch (e) {
    console.error('[markdown] marked.parse error:', e)
    return escapeHtml(content)
  }

  try { html = renderMath(html) } catch (e) { console.warn('[markdown] renderMath error:', e) }
  try { html = enhanceCodeBlocks(html) } catch (e) { console.warn('[markdown] enhanceCodeBlocks error:', e) }
  try { html = enhanceTables(html) } catch (e) { console.warn('[markdown] enhanceTables error:', e) }

  if (relatedConcepts.length > 0) {
    try { html = highlightConcepts(html, relatedConcepts) } catch (e) { console.warn('[markdown] highlightConcepts error:', e) }
  }

  return html
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderMath(html) {
  return html
}

function _renderMath_full(html) {
  html = html.replace(/\$\$([\s\S]+?)\$\$/g, (_, formula) => {
    try {
      return katex.renderToString(formula.trim(), {
        displayMode: true,
        throwOnError: false,
      })
    } catch (e) {
      return `<pre class="katex-error">$${formula}$</pre>`
    }
  })

  html = html.replace(/\$(\\[a-zA-Z]+(?:{[^}]*})?|\w[\w\s+\-*/=<>()\[\]{}^_|&;:,.!?'"]*)\$/g, (_, formula) => {
    if (formula.length > 200) return `$${formula}$`
    try {
      return katex.renderToString(formula.trim(), {
        displayMode: false,
        throwOnError: false,
      })
    } catch (e) {
      return `<code>$${formula}$</code>`
    }
  })

  return html
}

function enhanceCodeBlocks(html) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  doc.querySelectorAll('pre code').forEach((code) => {
    const pre = code.parentElement
    if (!pre || pre.querySelector('.code-header')) return

    const langClass = Array.from(code.classList).find((c) => c.startsWith('language-'))
    const lang = langClass ? langClass.replace('language-', '') : ''

    const langDisplay = lang || 'plain text'
    const langColor = getLangColor(lang)

    const header = doc.createElement('div')
    header.className = 'code-header'
    header.innerHTML = `
      <span style="display:flex;align-items:center;gap:6px">
        <span style="width:10px;height:10px;border-radius:50%;background:${langColor};display:inline-block;flex-shrink:0"></span>
        <span style="color:#aaa;font-size:11px;font-weight:500;letter-spacing:0.3px">${langDisplay}</span>
      </span>
      <button class="copy-btn" onclick="(function(btn){var pre=btn.closest('pre');var code=pre.querySelector('code');var text=code.textContent;navigator.clipboard.writeText(text).then(function(){btn.classList.add('copied');btn.innerHTML='\\u2713 \\u5df2\\u590d\\u5236';setTimeout(function(){btn.classList.remove('copied');btn.innerHTML='\\ud83d\\udccb \\u590d\\u5236'},2000)}).catch(function(){btn.innerHTML='\\u590d\\u5236\\u5931\\u8d25'});})(this)">📋 复制</button>
    `

    pre.insertBefore(header, code)
  })

  return doc.body.innerHTML
}

function getLangColor(lang) {
  const colors = {
    javascript: '#f7df1e',
    js: '#f7df1e',
    typescript: '#3178c6',
    ts: '#3178c6',
    python: '#3776ab',
    py: '#3776ab',
    java: '#b07219',
    go: '#00add8',
    rust: '#dea584',
    ruby: '#cc342d',
    swift: '#f05138',
    kotlin: '#a97bff',
    scala: '#dc322f',
    bash: '#4eaa25',
    shell: '#4eaa25',
    sh: '#4eaa25',
    sql: '#e38c00',
    html: '#e34f26',
    css: '#1572b6',
    json: '#292929',
    yaml: '#cb171e',
    xml: '#0060ac',
    markdown: '#083fa1',
    dockerfile: '#2496ed',
    c: '#555555',
    cpp: '#f34b7d',
    'c++': '#f34b7d',
    'c#': '#178600',
    php: '#4f5d95',
    r: '#198ce7',
  }
  return colors[lang?.toLowerCase()] || '#666'
}

function enhanceTables(html) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  doc.querySelectorAll('table').forEach((table) => {
    const wrapper = doc.createElement('div')
    wrapper.className = 'md-table-wrapper'
    table.parentNode.insertBefore(wrapper, table)
    wrapper.appendChild(table)
  })

  return doc.body.innerHTML
}

function highlightConcepts(html, relatedConcepts) {
  const escapedTerms = relatedConcepts
    .map((c) => ({
      term: c.term,
      slug: c.slug,
      escaped: c.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    }))
    .sort((a, b) => b.escaped.length - a.escaped.length)

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  function highlightTextNodes(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      let text = node.textContent
      if (!text.trim()) return

      for (const { term, slug, escaped } of escapedTerms) {
        const regex = new RegExp(`(${escaped})`, 'gi')
        text = text.replace(regex, (match) => {
          const span = document.createElement('span')
          span.className =
            'concept-link text-[#10a37f] underline cursor-pointer hover:text-[#1ec48f] transition-all duration-200'
          span.setAttribute('data-slug', slug)
          span.setAttribute('data-term', match)
          span.textContent = match
          return span.outerHTML
        })
      }

      if (text !== node.textContent) {
        const temp = document.createElement('span')
        temp.innerHTML = text
        node.parentNode.replaceChild(temp, node)
        while (temp.firstChild) {
          temp.parentNode.insertBefore(temp.firstChild, temp)
        }
        temp.parentNode.removeChild(temp)
      }
    } else if (
      node.nodeType === Node.ELEMENT_NODE &&
      !['SCRIPT', 'STYLE', 'CODE', 'PRE'].includes(node.tagName)
    ) {
      Array.from(node.childNodes).forEach(highlightTextNodes)
    }
  }

  highlightTextNodes(doc.body)

  return doc.body.innerHTML
}
