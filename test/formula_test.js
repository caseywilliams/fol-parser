import Formula from '../formula'
import lib from '../lib'
import parse from '../parse'
import test from 'ava'

test('Formula can be stringified', t => {
  const f = new Formula('A.y P(f(y), z) | !!Q(x)')
  t.is(f.stringified, 'A.y P(f(y), z) | !!Q(x)')
})

test('Formula keeps track of used variable/constant/function names', t => {
  const s = 'A.y P(f(y), z) | !!Q(x)'
  const f = new Formula(s)
  t.deepEqual(f.names, lib.collectNames(parse(s)))
})

test('Formula can be negated', t => {
  const f = new Formula('A.y P(f(y), z) | !!Q(x)')
  f.negate()
  t.is(f.stringified, 'E.y !P(f(y), z) & !Q(x)')
})

test('Formula can be reset after modifications to the source', t => {
  const s = 'A.y P(f(y), z) | !!Q(x)'
  const f = new Formula(s)
  f.negate()
  f.reset()
  t.is(f.stringified, s)
})

test('Negated version can be retrieved without affecting the source', t => {
  const f = new Formula('A.y P(f(y), z) | !!Q(x)')
  t.is(f.negated, 'E.y !P(f(y), z) & !Q(x)')
})

test('Formula can collapse its negations', t => {
  const f = new Formula('A.y P(f(y), z) | !!Q(x)')
  f.collapse()
  t.is(f.stringified, 'A.y P(f(y), z) | Q(x)')
})

test('Collapsed version can be retrieved without affecting the source', t => {
  const f = new Formula('A.y P(f(y), z) | !!Q(x)')
  t.is(f.collapsed, 'A.y P(f(y), z) | Q(x)')
})

test('Rename conflicting quantified variables', t => {
  const f = new Formula('P(x) & A.x (Q(x) -> E.y R(x, y) | !E.y P(y))')
  t.is(f.rename().stringified, 'P(x) & A.z (Q(z) -> E.y R(z, y) | !E.w P(w))')
})

test('Rename variables when there are multiple same quantifiers', t => {
  const f = new Formula('E.x (!p(x) & !q(x)) | A.x p(x) | A.x q(x)')
  t.is(f.rename().stringified, 'E.x (!p(x) & !q(x)) | A.z p(z) | A.y q(y)')
})

test('Rename nested quantified variables', t => {
  const f = new Formula('A.x A.y E.z f(w, x, y, z) | !E.x !E.y !A.z f(w, x, y, z)')
  t.is(f.rename().stringified, 'A.x A.y E.z f(w, x, y, z) | !E.v !E.u !A.t f(s, v, u, t)')
})
