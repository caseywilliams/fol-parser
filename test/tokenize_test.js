const test = require('ava')
const tokenize = require('../tokenize')

const operatorToken = (id, start = 0, end = 1) => {
  return { id, type: 'operator', start, end }
}
const booleanToken = (truthy = 1, start = 0, end = 1) => {
  return {
    id: (truthy ? 'True' : 'False'),
    type: 'boolean',
    start,
    end
  }
}

const nameToken = (id, value, start = 0, end = 1) => {
  return { id, type: 'name', start, end, value }
}

test('Empty statement', t => {
  t.deepEqual(tokenize(), [])
})

test('Predicates', t => {
  t.deepEqual(tokenize('Q'), [nameToken('Predicate', 'Q')])
  t.deepEqual(tokenize('T'), [nameToken('Predicate', 'T')])
  t.deepEqual(tokenize('E'), [nameToken('Predicate', 'E')])
  t.deepEqual(tokenize('A'), [nameToken('Predicate', 'A')])
})

test('Predicates with multi-character names', t => {
  t.deepEqual(tokenize('Predicate'), [nameToken('Predicate', 'Predicate', 0, 9)])
})

test('Boolean words', t => {
  t.deepEqual(tokenize('true'), [booleanToken(1, 0, 4)])
  t.deepEqual(tokenize('True'), [booleanToken(1, 0, 4)])
  t.deepEqual(tokenize('false'), [booleanToken(0, 0, 5)])
  t.deepEqual(tokenize('False'), [booleanToken(0, 0, 5)])
})

test('Numeric booleans', t => {
  t.deepEqual(tokenize('1'), [booleanToken()])
  t.deepEqual(tokenize('0'), [booleanToken(0)])
})

test('Boolean symbols', t => {
  t.deepEqual(tokenize('⊤'), [booleanToken()])
  t.deepEqual(tokenize('⊥'), [booleanToken(0)])
})

test('Binary operations', t => {
  t.deepEqual(tokenize('∨'), [operatorToken('Disjunction')])
  t.deepEqual(tokenize('|'), [operatorToken('Disjunction')])
  t.deepEqual(tokenize('∧'), [operatorToken('Conjunction')])
  t.deepEqual(tokenize('&'), [operatorToken('Conjunction')])
  t.deepEqual(tokenize('→'), [operatorToken('Implication')])
  t.deepEqual(tokenize('->'), [operatorToken('Implication', 0, 2)])
})

test('Variable or constant', t => {
  t.deepEqual(tokenize('x'), [nameToken('VariableOrConstant', 'x')])
})

test('Function notation', t => {
  t.deepEqual(tokenize('f(x)'), [
    nameToken('FunctionExpression', 'f', 0, 1),
    operatorToken('LeftParen', 1, 2),
    nameToken('VariableOrConstant', 'x', 2, 3),
    operatorToken('RightParen', 3, 4)
  ])
})

test('Negation', t => {
  t.deepEqual(tokenize('!'), [operatorToken('Negation')])
  t.deepEqual(tokenize('¬'), [operatorToken('Negation')])
  t.deepEqual(tokenize('~'), [operatorToken('Negation')])
})

test('Parentheses', t => {
  t.deepEqual(tokenize('('), [operatorToken('LeftParen')])
  t.deepEqual(tokenize(')'), [operatorToken('RightParen')])
})

test('Universal quantifier', t => {
  t.deepEqual(tokenize('∀'), [operatorToken('Universal')])
})

test('Universal quantifier ASCII', t => {
  t.deepEqual(tokenize('A.'), [operatorToken('Universal', 0, 2)])
})

test('Existential quantifier', t => {
  t.deepEqual(tokenize('∃'), [operatorToken('Existential')])
})

test('Existential quantifier ASCII', t => {
  t.deepEqual(tokenize('E.'), [operatorToken('Existential', 0, 2)])
})

test('Unrecognized symbols', t => {
  t.throws(() => tokenize('-'), { message: 'Unrecognized symbol: \'-\' (at 1)' })
  t.throws(() => tokenize('*'), { message: 'Unrecognized symbol: \'*\' (at 1)' })
})
