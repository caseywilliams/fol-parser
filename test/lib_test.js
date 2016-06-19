import test from 'ava'
import lib from '../lib'
import parse from '../parse'

const negate = (s) => lib.stringify(lib.negate(parse(s)))
const collapseNegations = (s) => lib.stringify(lib.collapseNegations(parse(s)))

test('Basic string output', t => {
  const s = 'E.x f(x) | A.y (!Q -> P(y,z)) & R'
  t.is(lib.stringify(parse(s)), s)
})

test('Negation', t => {
  t.is(negate('x'), '!x')
  t.is(negate('!x'), 'x')
  t.is(negate('!(x)'), '(x)')
  t.is(negate('f(x)'), '!f(x)')
  t.is(negate('(f(x))'), '(!f(x))')
  t.is(negate('!f(x)'), 'f(x)')
  t.is(negate('P(x)'), '!P(x)')
  t.is(negate('!P(x)'), 'P(x)')
  t.is(negate('P | Q'), '!P & !Q')
  t.is(negate('(P | Q)'), '(!P & !Q)')
  t.is(negate('(P & Q)'), '(!P | !Q)')
  t.is(negate('(P -> !!Q)'), '(P & !Q)')
  t.is(negate('(!!P -> !!!Q)'), '(!!P & !!Q)')
  t.is(negate('!(!!P -> !!!Q)'), '(!!P -> !!!Q)')
  t.is(negate('!!P -> !!!Q'), '!!P & !!Q')
  t.is(negate('P | Q & R -> S'), 'P | Q & R & !S')
  t.is(negate('A.x f(x)'), 'E.x !f(x)')
  t.is(negate('E.x f(x)'), 'A.x !f(x)')
  t.is(negate('(A.x f(x))'), '(E.x !f(x))')
  t.is(negate('A.x (f(x) | P)'), 'E.x !(f(x) | P)')
})

test('Negation scope reduction', t => {
  t.is(collapseNegations('P'), 'P')
  t.is(collapseNegations('!P'), '!P')
  t.is(collapseNegations('!!!P'), '!P')
  t.is(collapseNegations('!!!!f(x)'), 'f(x)')
  t.is(collapseNegations('!(P | Q)'), '(!P & !Q)')
  t.is(collapseNegations('!!(P | Q)'), '(P | Q)')
  t.is(collapseNegations('!!!(P | Q)'), '(!P & !Q)')
  t.is(collapseNegations('!A.x f(x)'), 'E.x !f(x)')
  t.is(collapseNegations('!!!A.x f(x)'), 'E.x !f(x)')
  t.is(collapseNegations('A.x !!f(x)'), 'A.x f(x)')
  t.is(collapseNegations('!A.x !!P(x) -> !!!Q'), 'E.x !P(x) -> !Q')
  t.is(collapseNegations('(!!P -> !!!Q)'), '(P -> !Q)')
  t.is(collapseNegations('!!A.x !!P(x) -> !!!Q'), 'A.x P(x) -> !Q')
  t.is(collapseNegations('!A.x (!!P(x) -> !!!Q)'), 'E.x (P(x) & Q)')
})
