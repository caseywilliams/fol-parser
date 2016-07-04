import Formula from '../formula'
import test from 'ava'
import { asCharCodes } from './_helpers'

test('Formula can be stringified', t => {
  const f = new Formula('A.y P(f(y), z) | !!Q(x)')
  t.is(f.stringified, 'A.y P(f(y), z) | !!Q(x)')
})

test('Formula keeps track of used variable/constant/function names', t => {
  const f = new Formula('A.y P(f(y), z) | !!Q(x)')
  t.deepEqual(f.names, asCharCodes(['y', 'f', 'z', 'x']))
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
