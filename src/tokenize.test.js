const tokenize = require('./tokenize')

const operatorToken = (id, start = 0, end = 1) => {
  return { id, type: 'operator', start, end }
}
const booleanToken = (truthy = 1, start = 0, end = 1) => {
  return {
    id: (truthy ? 'True' : 'False'),
    type: 'boolean',
    start,
    end,
  }
}

const nameToken = (id, value, start = 0, end = 1) => {
  return { id, type: 'name', start, end, value }
}

describe('tokenize', () => {
  test('Empty statement', () => {
    expect(tokenize()).toEqual([])
  })

  test('Predicates', () => {
    expect(tokenize('Q')).toEqual([nameToken('Predicate', 'Q')])
    expect(tokenize('T')).toEqual([nameToken('Predicate', 'T')])
    expect(tokenize('E')).toEqual([nameToken('Predicate', 'E')])
    expect(tokenize('A')).toEqual([nameToken('Predicate', 'A')])
  })

  test('Predicates with multi-character names', () => {
    expect(tokenize('Predicate')).toEqual([nameToken('Predicate', 'Predicate', 0, 9)])
  })

  test('Boolean words', () => {
    expect(tokenize('true')).toEqual([booleanToken(1, 0, 4)])
    expect(tokenize('True')).toEqual([booleanToken(1, 0, 4)])
    expect(tokenize('false')).toEqual([booleanToken(0, 0, 5)])
    expect(tokenize('False')).toEqual([booleanToken(0, 0, 5)])
  })

  test('Numeric booleans', () => {
    expect(tokenize('1')).toEqual([booleanToken()])
    expect(tokenize('0')).toEqual([booleanToken(0)])
  })

  test('Boolean symbols', () => {
    expect(tokenize('⊤')).toEqual([booleanToken()])
    expect(tokenize('⊥')).toEqual([booleanToken(0)])
  })

  test('Disjunction', () => {
    expect(tokenize('∨')).toEqual([operatorToken('Disjunction')])
    expect(tokenize('|')).toEqual([operatorToken('Disjunction')])
  })

  test('Conjunction', () => {
    expect(tokenize('∧')).toEqual([operatorToken('Conjunction')])
    expect(tokenize('&')).toEqual([operatorToken('Conjunction')])
  })

  test('Implication', () => {
    expect(tokenize('→')).toEqual([operatorToken('Implication')])
    expect(tokenize('->')).toEqual([operatorToken('Implication', 0, 2)])
  })

  test('Variable or constant', () => {
    expect(tokenize('x')).toEqual([nameToken('VariableOrConstant', 'x')])
    expect(tokenize('v')).toEqual([nameToken('VariableOrConstant', 'v')])
  })

  test('Function notation', () => {
    expect(tokenize('f(x)')).toEqual([
      nameToken('FunctionExpression', 'f', 0, 1),
      operatorToken('LeftParen', 1, 2),
      nameToken('VariableOrConstant', 'x', 2, 3),
      operatorToken('RightParen', 3, 4),
    ])
  })

  test('Negation', () => {
    expect(tokenize('!')).toEqual([operatorToken('Negation')])
    expect(tokenize('¬')).toEqual([operatorToken('Negation')])
    expect(tokenize('~')).toEqual([operatorToken('Negation')])
  })

  test('Parentheses', () => {
    expect(tokenize('(')).toEqual([operatorToken('LeftParen')])
    expect(tokenize(')')).toEqual([operatorToken('RightParen')])
  })

  test('Universal quantifier', () => {
    expect(tokenize('∀')).toEqual([operatorToken('Universal')])
    expect(tokenize('A.')).toEqual([operatorToken('Universal', 0, 2)])
  })

  test('Existential quantifier', () => {
    expect(tokenize('∃')).toEqual([operatorToken('Existential')])
    expect(tokenize('E.')).toEqual([operatorToken('Existential', 0, 2)])
  })

  test('Unrecognized symbols', () => {
    expect(() => tokenize('-')).toThrow(/Unrecognized symbol/)
    expect(() => tokenize('*')).toThrow(/Unrecognized symbol/)
  })
})

