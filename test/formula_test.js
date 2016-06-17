import test from 'ava'
import Formula from '../formula'

test('Basic string output', t => {
  const f = new Formula('E.x f(x) | A.y (!Q -> P(y)) & R')
  t.is(f.stringify(), 'E.x f(x) | A.y (!Q -> P(y)) & R')
})
