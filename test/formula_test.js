import test from 'ava'
import Formula from '../formula'
import parse from '../parse'

test('Creation from an object', t => {
  const f = new Formula(parse('E.x f(x) | A.y (!Q -> P(y)) & R'))
  t.is(f.stringify(), 'E.x f(x) | A.y (!Q -> P(y)) & R')
})

test('Basic string output', t => {
  const f = new Formula('E.x f(x) | A.y (!Q -> P(y)) & R')
  t.is(f.stringify(), 'E.x f(x) | A.y (!Q -> P(y)) & R')
})

test('Negation of terms', t => {
  t.is(new Formula('x').negate().stringify(), '!x')
  t.is(new Formula('!x').negate().stringify(), 'x')
  t.is(new Formula('f(x)').negate().stringify(), '!f(x)')
  t.is(new Formula('!f(x)').negate().stringify(), 'f(x)')
})

test('Negation of predicates', t => {
  t.is(new Formula('P(x)').negate().stringify(), '!P(x)')
  t.is(new Formula('!P(x)').negate().stringify(), 'P(x)')
})

test('Negation of binary expressions', t => {
  t.is(new Formula('P | Q').negate().stringify(), '!P | !Q')
  t.is(new Formula('(P | Q)').negate().stringify(), '(!P & !Q)')
  t.is(new Formula('(P & Q)').negate().stringify(), '(!P | !Q)')
  t.is(new Formula('(P -> Q)').negate().stringify(), '(P & !Q)')
})

test('Negation of quantified expressions', t => {
  t.is(new Formula('A.x f(x)').negate().stringify(), 'E.x !f(x)')
  t.is(new Formula('E.x f(x)').negate().stringify(), 'A.x !f(x)')
  t.is(new Formula('(A.x f(x))').negate().stringify(), '(E.x !f(x))')
})
