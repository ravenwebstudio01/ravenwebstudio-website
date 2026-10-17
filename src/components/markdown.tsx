import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import { cx } from '@/lib/utils'

/**
 * Renders administrator-edited Markdown safely: raw HTML is skipped (never
 * executed), images are not rendered, and only http(s)/mailto/tel/relative
 * links survive. External links open with rel="noopener noreferrer".
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cx('prose-rws', className)}>
      <ReactMarkdown
        skipHtml
        remarkPlugins={[remarkGfm, remarkBreaks]}
        disallowedElements={['img', 'iframe', 'script', 'style']}
        unwrapDisallowed
        urlTransform={(url) => (/^(https?:|mailto:|tel:|\/|#)/i.test(url) ? url : '')}
        components={{
          a: ({ href, children: linkChildren }) => {
            const external = href ? /^https?:/i.test(href) : false
            return (
              <a href={href} {...(external ? { rel: 'noopener noreferrer', target: '_blank' } : {})}>
                {linkChildren}
              </a>
            )
          },
          h1: ({ children: h }) => <h2>{h}</h2>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
