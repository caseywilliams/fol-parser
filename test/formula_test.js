import Formula from '../formula'
import test from 'ava'

test('Formula can be stringified', t => {
  const f = new Formula('A.y P(f(y), z) | !!Q(x)')
  t.is(f.stringify(), 'A.y P(f(y), z) | !!Q(x)')
})

test('Formula can be negated', t => {
  const f = new Formula('A.y P(f(y), z) | !!Q(x)')
  t.is(f.negate().stringify(), 'E.y !P(f(y), z) & !Q(x)')
})

test('Negated version can be retrieved without affecting the source', t => {
  const f = new Formula('A.y P(f(y), z) | !!Q(x)')
  t.is(f.negate().stringify(), 'E.y !P(f(y), z) & !Q(x)')
})

test('Formula can collapse its negations', t => {
  const f = new Formula('A.y P(f(y), z) | !!Q(x)')
  t.is(f.collapseNegations().stringify(), 'A.y P(f(y), z) | Q(x)')
})

test('Rename conflicting quantified variables', t => {
  const f = new Formula('P(x) & A.x (Q(x) -> E.y R(x, y) | !E.y P(y))')
  t.is(f.rename().stringify(), 'P(x) & A.z (Q(z) -> E.y R(z, y) | !E.w P(w))')
})

test('Rename variables when there are multiple same quantifiers', t => {
  const f = new Formula('E.x (!p(x) & !q(x)) | A.x p(x) | A.x q(x)')
  t.is(f.rename().stringify(), 'E.x (!p(x) & !q(x)) | A.z p(z) | A.y q(y)')
})

test('Rename nested quantified variables', t => {
  const f = new Formula('A.x A.y E.z f(w, x, y, z) | !E.x !E.y !A.z f(w, x, y, z)')
  t.is(f.rename().stringify(), 'A.x A.y E.z f(w, x, y, z) | !E.v !E.u !A.t f(s, v, u, t)')
})
