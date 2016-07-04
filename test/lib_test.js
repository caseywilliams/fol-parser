import lib from '../lib'
import parse from '../parse'
import { asCharCodes } from './_helpers'
import test from 'ava'

const negate = (s) => lib.stringify(lib.negate(parse(s)))
const collapseNegations = (s) => lib.stringify(lib.collapseNegations(parse(s)))
const removeImplications = (s) => lib.stringify(lib.removeImplications(parse(s)))
const collectNames = (s) => lib.collectNames(parse(s))

test('Basic string output', t => {
  const s = 'E.x f(x) | A.y (!Q -> P(y, z)) & R'
  t.is(lib.stringify(parse(s)), s)
})

test('Variables/constants can be negated', t => {
  t.is(negate('x'), '!x')
})

test('Functions can be negated', t => {
  t.is(negate('f(x)'), '!f(x)')
})

test('Predicates can be negated', t => {
  t.is(negate('P(x)'), '!P(x)')
})

test('Binary expressions can be negated', t => {
  t.is(negate('P | Q'), '!P & !Q')
  t.is(negate('P & Q'), '!P | !Q')
  t.is(negate('P -> Q'), 'P & !Q')
})

test('Quantifiers can be negated', t => {
  t.is(negate('A.x f(x)'), 'E.x !f(x)')
  t.is(negate('E.x f(x)'), 'A.x !f(x)')
})

test('Negation of a negated expression returns the expression unchanged', t => {
  t.is(negate('!P'), 'P')
})

test('Negation by itself negates only the top "level" of an expression', t => {
  t.is(negate('P | Q & R -> S'), 'P | Q & R & !S')
})

test('Negation operation does not attempt to collapse multiple negations', t => {
  t.is(negate('!!!Q'), '!!Q')
})

test('Negation is applied within negated expression statements', t => {
  t.is(negate('(f(x))'), '(!f(x))')
})

test('Negation collapse does not affect already collapsed expressions', t => {
  t.is(collapseNegations('P'), 'P')
  t.is(collapseNegations('!P'), '!P')
})

test('Negation collapse collapses many negations', t => {
  t.is(collapseNegations('!!!P'), '!P')
  t.is(collapseNegations('!!!!P'), 'P')
})

test('Negation collapse collapses argument negations for predicates and functions', t => {
  t.is(collapseNegations('P(!!!f(x))'), 'P(!f(x))')
  t.is(collapseNegations('f(!!g(x))'), 'f(g(x))')
})

test('Negation collapse collapses both a function/predicate and its arguments', t => {
  t.is(collapseNegations('!!P(!!!f(x), !!g(x))'), 'P(!f(x), g(x))')
})

test('Negation collapse collapses both sides of binary expressions', t => {
  t.is(collapseNegations('!!P -> !!!Q'), 'P -> !Q')
})

test('Negation collapse applies an outside negation to the inside of an expression statement', t => {
  t.is(collapseNegations('!(P)'), '(!P)')
})

test('Negation collapse applies an outside negation to a quantified expression', t => {
  t.is(collapseNegations('!A.x f(x)'), 'E.x !f(x)')
})

test('Negation collapse collapses multiply negated quantified expressions', t => {
  t.is(collapseNegations('A.x !!f(x)'), 'A.x f(x)')
})

test('Implications can be removed', t => {
  t.is(removeImplications('P -> Q'), '!P | Q')
})

test('Implications can be removed within expression statements', t => {
  t.is(removeImplications('(P -> Q)'), '(!P | Q)')
})

test('Implication removal is fully applied throughout an expression', t => {
  t.is(removeImplications('(P -> Q) -> (R -> S)'), '(P & !Q) | (!R | S)')
})

test('Implication removal works correctly when either side is a quantified expression', t => {
  t.is(removeImplications('A.x f(x) -> E.y g(y)'), 'E.x !f(x) | E.y g(y)')
})

test('Implication removal works correctly within a quantified expression', t => {
  t.is(removeImplications('A.x (f(x) -> g(y))'), 'A.x (!f(x) | g(y))')
})

test('Collect names from functions', t => {
  t.deepEqual(collectNames('f(x, g(y, z))'), asCharCodes(['f', 'x', 'g', 'y', 'z']))
})

test('Collect names from predicates', t => {
  t.deepEqual(collectNames('P(x, g(y, z))'), asCharCodes(['x', 'g', 'y', 'z']))
})

test('Collect names from binary expressions', t => {
  t.deepEqual(collectNames('f(x) | g(y)'), asCharCodes(['f', 'x', 'g', 'y']))
})

test('Collect names from quantified expressions', t => {
  t.deepEqual(collectNames('A.x f(x)'), asCharCodes(['x', 'f']))
})

test('Collect names from expression statements', t => {
  t.deepEqual(collectNames('(P(x))'), asCharCodes(['x']))
})

test('Collect names from negated expressions', t => {
  t.deepEqual(collectNames('!f(x)'), asCharCodes(['f', 'x']))
})
