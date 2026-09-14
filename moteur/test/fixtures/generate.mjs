// generate.mjs — writes human-inspectable sample fixtures into this folder.
// The test suite itself is hermetic (it builds CSV bytes on the fly via
// ../support.js); these files exist only so a human can eyeball representative
// inputs. Regenerate with:  node test/fixtures/generate.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildCsv, line, reorder, HEAD, ROW1, ROW2, BOM } from '../support.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const w = (name, text) => { fs.writeFileSync(path.join(here, name), text); console.log('wrote', name) }

// 01 nominal (BOM, LF, comma decimals, trailing ;)
w('valid.csv', buildCsv())
// 12b no BOM
w('valid_nobom.csv', buildCsv({ bom: false }))
// 13a CRLF
w('valid_crlf.csv', buildCsv({ eol: '\r\n' }))
// 02 reordered columns
{
  const { header, rows } = reorder(HEAD, [ROW1, ROW2], [10, 0, 4, 8, 2, 6, 1, 9, 5, 3, 7])
  w('reordered.csv', buildCsv({ header, rows }))
}
// 03 new unknown column
w('new_column.csv', buildCsv({ header: [...HEAD, 'Turbo flag'], rows: [[...ROW1, 'YES'], [...ROW2, 'NO']] }))
// 04 critical column missing (Nett retail price)
{
  const header = HEAD.filter(c => c !== 'Nett retail price')
  const rows = [ROW1, ROW2].map(r => r.filter((_, i) => HEAD[i] !== 'Nett retail price'))
  w('missing_critical.csv', buildCsv({ header, rows }))
}
// 05 non-critical column missing (Barcode)
{
  const header = HEAD.filter(c => c !== 'Barcode')
  const rows = [ROW1, ROW2].map(r => r.filter((_, i) => HEAD[i] !== 'Barcode'))
  w('missing_noncritical.csv', buildCsv({ header, rows }))
}
// 06 REAL: literal " (inches) inside a field — stored verbatim (quote:false)
{
  const r = [...ROW1]; r[2] = 'Elbow 1/2" pipe'
  w('literal_quote.csv', buildCsv({ rows: [r] }))
}
// P2 REAL: literal " inside a header name — stays one column (no ; = no split)
w('literal_quote_header.csv', buildCsv({ header: HEAD.map(c => c === 'Barcode' ? 'Pipe 1/2"' : c) }))
// 08 STRICT: wrong field count (a stray ';' splits one value) -> abort at load
{
  const badRow = 'JMJ;1091132;Catalytic;Converter;102,81;228,47;JMJ;JMJ1091132;5901436521129;6,70;14;1;'
  w('wrong_field_count.csv', BOM + [line(HEAD), line(ROW2), badRow].join('\n') + '\n')
}
// 09 non-numeric price
{
  const r = [...ROW1]; r[3] = 'abc'; r[9] = 'N/A'
  w('nonnumeric_price.csv', buildCsv({ rows: [r] }))
}
// 10 empty file
w('empty.csv', '')
// 11 header only
w('header_only.csv', BOM + line(HEAD) + '\n')
// 16 numeric edge cases
{
  const neg = [...ROW1]; neg[3] = '-12,50'; neg[9] = '-3'
  const zero = [...ROW1]; zero[0] = 'ZERO'; zero[3] = '0'; zero[4] = '0,00'; zero[9] = '0'
  const empty = [...ROW1]; empty[0] = 'EMPTY'; empty[3] = ''; empty[4] = ''; empty[9] = ''
  w('decimals_edge.csv', buildCsv({ rows: [neg, zero, empty] }))
}
// 17 slug collision
w('slug_collision.csv', buildCsv({ header: [...HEAD, 'Parts-name'], rows: [[...ROW1, 'dup'], [...ROW2, 'dup']] }))
// SAFETY-f slug -> empty
w('slug_empty.csv', buildCsv({ header: [...HEAD, '# @ !'], rows: [[...ROW1, 'q'], [...ROW2, 'q']] }))

console.log('done')
