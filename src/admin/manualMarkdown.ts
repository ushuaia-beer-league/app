/**
 * The manual as the file people share, written from the same data the panel
 * renders.
 *
 * Two readers, one copy. `scripts/build-manual.ts` writes the result to
 * `docs/COMO-FUNCIONA.md`, and `manual.test.ts` refuses to pass when the
 * committed file stops matching — which is the only thing that keeps a manual
 * in two places from becoming two manuals that disagree.
 *
 * Pure, so the test can compare strings without a filesystem in the way.
 */

import { MANUAL, MANUAL_INTRO, MANUAL_TITLE, type ManualBlock } from './manual'

function blockToMarkdown(block: ManualBlock): string {
  switch (block.kind) {
    case 'subtitle':
      return `### ${block.text}`
    case 'note':
      // A blockquote, which is what GitHub renders as the aside the panel draws
      // with the league's gold.
      return `> ${block.text}`
    case 'list':
      return block.items.map((item) => `- ${item}`).join('\n')
    case 'table': {
      const head = `| ${block.headings.join(' | ')} |`
      const rule = `| ${block.headings.map(() => '---').join(' | ')} |`
      const rows = block.rows.map((row) => `| ${row.join(' | ')} |`)
      return [head, rule, ...rows].join('\n')
    }
    case 'text':
      return block.text
  }
}

export function manualMarkdown(): string {
  const parts: string[] = [
    `# ${MANUAL_TITLE}`,
    // One string: the parts are joined with a blank line, and a comment split
    // across them renders as four paragraphs of comment.
    [
      '<!-- Generado por scripts/build-manual.ts desde src/admin/manual.ts.',
      'No editar a mano: el panel muestra el mismo texto en /admin/manual,',
      'y un test falla si este archivo deja de coincidir. -->',
    ].join('\n'),
    ...MANUAL_INTRO.map(blockToMarkdown),
  ]

  for (const section of MANUAL) {
    parts.push(
      '---',
      `## ${section.title}`,
      ...section.blocks.map(blockToMarkdown),
    )
  }

  return `${parts.join('\n\n')}\n`
}
