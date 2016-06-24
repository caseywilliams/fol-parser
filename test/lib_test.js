import test from 'ava'
import sinon from 'sinon'
import lib from '../lib'
import parse from '../parse'

const negate = (s) => lib.stringify(lib.negate(parse(s)))
const collapseNegations = (s) => lib.stringify(lib.collapseNegations(parse(s)))
const removeImplications = (s) => lib.stringify(lib.removeImplications(parse(s)))
const renameVariables = (s) => lib.stringify(lib.renameVariables(parse(s)))

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
  t.is(collapseNegations('f(!!g(x))'), 'f(g(x))')
  t.is(collapseNegations('!(P | Q)'), '(!P & !Q)')
  t.is(collapseNegations('!!(P | Q)'), '(P | Q)')
  t.is(collapseNegations('!!!(P | Q)'), '(!P & !Q)')
  t.is(collapseNegations('P(!!g(x))'), 'P(g(x))')
  t.is(collapseNegations('!A.x f(x)'), 'E.x !f(x)')
  t.is(collapseNegations('!!!A.x f(x)'), 'E.x !f(x)')
  t.is(collapseNegations('A.x !!f(x)'), 'A.x f(x)')
  t.is(collapseNegations('!A.x !!P(x) -> !!!Q'), 'E.x !P(x) -> !Q')
  t.is(collapseNegations('(!!P -> !!!Q)'), '(P -> !Q)')
  t.is(collapseNegations('!!A.x !!P(x) -> !!!Q'), 'A.x P(x) -> !Q')
  t.is(collapseNegations('!A.x (!!P(x) -> !!!Q)'), 'E.x (P(x) & Q)')
})

test('Remove implications', t => {
  t.is(removeImplications('P -> Q'), '!P | Q')
  t.is(removeImplications('(P -> Q)'), '(!P | Q)')
  t.is(removeImplications('(P -> Q) -> (R -> S)'), '(P & !Q) | (!R | S)')
  t.is(removeImplications('A.x f(x) -> g(y)'), 'E.x !f(x) | g(y)')
  t.is(removeImplications('A.x (f(x) -> g(y))'), 'A.x (!f(x) | g(y))')
})

sinon.stub(Math, 'random')
  .returns(0.99) // 'z'
  .onCall(1).returns(0.95) // 'y'
  .onCall(2).returns(0.90) // 'x'
  .onCall(3).returns(0.85) // 'w'
  .onCall(4).returns(0.80) // 'v'
  .onCall(5).returns(0.75) // 'u'

test('Rename quantified variables', t => {
  t.is(renameVariables('A.y f(y) | E.y g(y)'),
    'A.y f(y) | E.z g(z)')
  Math.random.reset()
  t.is(renameVariables('A.y P(y) | E.y (Q(z,y) & f(y)))'),
    'A.y P(y) | E.z (Q(x,z) & f(z))')
  Math.random.reset()
})

test('Rename with nested quantifiers', t => {
  t.is(renameVariables('A.x E.y A.z f(x,y,z) | E.x A.y E.z g(x,y,z)'),
    'A.x E.y A.z f(x,y,z) | E.w A.u E.t g(w,u,t)')
  Math.random.reset()
})

test('Rename with free variable conflict', t => {
  t.is(renameVariables('A.x (p(x) -> E.y A.z ((p(w) | q(x,y)) -> A.w r(x,w)))'),
    'A.x (p(x) -> E.y A.z ((p(w) | q(x,y)) -> A.u r(x,u)))'
  )
  Math.random.reset()
})
