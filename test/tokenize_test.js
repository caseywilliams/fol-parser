import test from 'ava'
import tokenize from '../tokenize'

const operatorOutput = (id, start = 0, end = 1) => {
  return { id, type: 'operator', start, end }
}
const booleanOutput = (truthy = 1, start = 0, end = 1) => {
  return {
    id: (truthy ? 'True' : 'False'),
    type: 'boolean',
    start,
    end
  }
}

test('Empty statement', t => {
  t.deepEqual(tokenize(), [])
})

test('Predicate', t => {
  t.deepEqual(tokenize('P'), [{
    id: 'Predicate',
    type: 'name',
    value: 'P',
    start: 0,
    end: 1
  }])
})

test('Boolean values', t => {
  t.deepEqual(tokenize('⊤'), [ booleanOutput() ])
  t.deepEqual(tokenize('1'), [ booleanOutput() ])
  t.deepEqual(tokenize('True'), [ booleanOutput(1, 0, 4) ])
  t.deepEqual(tokenize('⊥'), [ booleanOutput(0) ])
  t.deepEqual(tokenize('0'), [ booleanOutput(0) ])
  t.deepEqual(tokenize('False'), [ booleanOutput(0, 0, 5) ])
})

test('Multi-character predicate name', t => {
  t.deepEqual(tokenize('Predicate'), [{
    id: 'Predicate',
    type: 'name',
    value: 'Predicate',
    start: 0,
    end: 9
  }])
})

test('Binary operations', t => {
  t.deepEqual(tokenize('∨'), [ operatorOutput('Or') ])
  t.deepEqual(tokenize('|'), [ operatorOutput('Or') ])
  t.deepEqual(tokenize('∧'), [ operatorOutput('And') ])
  t.deepEqual(tokenize('&'), [ operatorOutput('And') ])
  t.deepEqual(tokenize('→'), [ operatorOutput('Implication') ])
  t.deepEqual(tokenize('->'), [ operatorOutput('Implication', 0, 2) ])
})

test('Variable or constant', t => {
  t.deepEqual(tokenize('x'), [{
    id: 'VariableOrConstant',
    type: 'name',
    value: 'x',
    start: 0,
    end: 1
  }])
})

test('Function symbol', t => {
  t.deepEqual(tokenize('f(x)'), [
    {
      id: 'FunctionExpression',
      type: 'name',
      value: 'f',
      start: 0,
      end: 1
    }, operatorOutput('LeftParen', 1, 2), {
      id: 'VariableOrConstant',
      type: 'name',
      value: 'x',
      start: 2,
      end: 3
    }, operatorOutput('RightParen', 3, 4)
  ])
})

test('Negation', t => {
  t.deepEqual(tokenize('!'), [ operatorOutput('Not') ])
  t.deepEqual(tokenize('¬'), [ operatorOutput('Not') ])
  t.deepEqual(tokenize('~'), [ operatorOutput('Not') ])
})

test('Parentheses', t => {
  t.deepEqual(tokenize('('), [ operatorOutput('LeftParen') ])
  t.deepEqual(tokenize(')'), [ operatorOutput('RightParen') ])
})

test('Quantifiers', t => {
  t.deepEqual(tokenize('∃'), [ operatorOutput('Existential') ])
  t.deepEqual(tokenize('E.'), [ operatorOutput('Existential', 0, 2) ])
  t.deepEqual(tokenize('∀'), [ operatorOutput('Universal') ])
  t.deepEqual(tokenize('A.'), [ operatorOutput('Universal', 0, 2) ])
})

test('Unrecognized symbols', t => {
  t.throws(() => tokenize('-'), 'Unrecognized symbol: \'-\' (at 1)')
  t.throws(() => tokenize('*'), 'Unrecognized symbol: \'*\' (at 1)')
})
