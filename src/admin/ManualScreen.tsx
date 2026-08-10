import { Link } from 'react-router-dom'
import {
  inlineParts,
  MANUAL,
  MANUAL_INTRO,
  MANUAL_TITLE,
  type ManualBlock,
} from './manual'
import './ManualScreen.css'

/**
 * The manual, inside the panel, for every role.
 *
 * Asked for by the operator in these words: it could be one of the admin
 * options, like a manual, with free access, and each section could call out to
 * it so anybody can find their way. So it lives here rather than only in the
 * repository, every screen links to its own section, and no role is kept out:
 * knowing how the thing works is not a permission.
 *
 * The content comes from `manual.ts`, which is also what writes the file people
 * share on GitHub. One copy, two readers.
 */
function Blocks({ blocks }: { blocks: readonly ManualBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        const key = `${block.kind}-${index}`

        if (block.kind === 'subtitle')
          return (
            <h3 className="manual__subtitle" key={key}>
              {block.text}
            </h3>
          )

        if (block.kind === 'note')
          return (
            <p className="manual__note" key={key}>
              <Marked text={block.text} />
            </p>
          )

        if (block.kind === 'list')
          return (
            <ul className="manual__list" key={key}>
              {block.items.map((item) => (
                <li key={item}>
                  <Marked text={item} />
                </li>
              ))}
            </ul>
          )

        if (block.kind === 'table')
          return (
            <div className="manual__table-scroll" key={key}>
              <table className="manual__table">
                <thead>
                  <tr>
                    {block.headings.map((heading) => (
                      <th key={heading} scope="col">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row) => (
                    <tr key={row.join('|')}>
                      {row.map((cell, cellIndex) => (
                        <td key={`${cell}-${cellIndex}`}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )

        return (
          <p className="manual__text" key={key}>
            <Marked text={block.text} />
          </p>
        )
      })}
    </>
  )
}

/** The one inline mark the manual uses, so emphasis survives both readers. */
function Marked({ text }: { text: string }) {
  return (
    <>
      {inlineParts(text).map((part, index) =>
        part.strong ? (
          <b key={`${part.text}-${index}`}>{part.text}</b>
        ) : (
          <span key={`${part.text}-${index}`}>{part.text}</span>
        ),
      )}
    </>
  )
}

export function ManualScreen() {
  return (
    <section className="manual">
      <header className="manual__header">
        <h1 className="manual__title">{MANUAL_TITLE}</h1>
        <Blocks blocks={MANUAL_INTRO} />
      </header>

      <nav aria-label="Secciones del manual" className="manual__toc">
        <ul>
          {MANUAL.map((section) => (
            <li key={section.id}>
              {/* A fragment on this same screen, so the browser scrolls and the
                  address becomes shareable with whoever asked the question. */}
              <Link to={`/admin/manual#${section.id}`}>{section.title}</Link>
            </li>
          ))}
        </ul>
      </nav>

      {MANUAL.map((section) => (
        <article className="manual__section" id={section.id} key={section.id}>
          <h2 className="manual__section-title">{section.title}</h2>
          <Blocks blocks={section.blocks} />
        </article>
      ))}
    </section>
  )
}
