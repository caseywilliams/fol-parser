import test from 'ava'
import Lexer from '../lexer'

const lexer = new Lexer()

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
  t.deepEqual(lexer.lex(), [])
})

test('Predicate', t => {
  t.deepEqual(lexer.lex('P'), [{
    id: 'Predicate',
    type: 'name',
    value: 'P',
    start: 0,
    end: 1
  }])
})

test('Boolean values', t => {
  t.deepEqual(lexer.lex('⊤'), [ booleanOutput() ])
  t.deepEqual(lexer.lex('1'), [ booleanOutput() ])
  t.deepEqual(lexer.lex('True'), [ booleanOutput(1, 0, 4) ])
  t.deepEqual(lexer.lex('⊥'), [ booleanOutput(0) ])
  t.deepEqual(lexer.lex('0'), [ booleanOutput(0) ])
  t.deepEqual(lexer.lex('False'), [ booleanOutput(0, 0, 5) ])
})

test('Multi-character predicate name', t => {
  t.deepEqual(lexer.lex('Predicate'), [{
    id: 'Predicate',
    type: 'name',
    value: 'Predicate',
    start: 0,
    end: 9
  }])
})

test('Binary operations', t => {
  t.deepEqual(lexer.lex('∨'), [ operatorOutput('Or') ])
  t.deepEqual(lexer.lex('|'), [ operatorOutput('Or') ])
  t.deepEqual(lexer.lex('∧'), [ operatorOutput('And') ])
  t.deepEqual(lexer.lex('&'), [ operatorOutput('And') ])
  t.deepEqual(lexer.lex('→'), [ operatorOutput('Implication') ])
  t.deepEqual(lexer.lex('->'), [ operatorOutput('Implication', 0, 2) ])
})

test('Variable or constant', t => {
  t.deepEqual(lexer.lex('x'), [{
    id: 'VariableOrConstant',
    type: 'name',
    value: 'x',
    start: 0,
    end: 1
  }])
})

test('Function symbol', t => {
  t.deepEqual(lexer.lex('f(x)'), [
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
  t.deepEqual(lexer.lex('!'), [ operatorOutput('Not') ])
  t.deepEqual(lexer.lex('¬'), [ operatorOutput('Not') ])
  t.deepEqual(lexer.lex('~'), [ operatorOutput('Not') ])
})

test('Parentheses', t => {
  t.deepEqual(lexer.lex('('), [ operatorOutput('LeftParen') ])
  t.deepEqual(lexer.lex(')'), [ operatorOutput('RightParen') ])
})

test('Quantifiers', t => {
  t.deepEqual(lexer.lex('∃'), [ operatorOutput('Existential') ])
  t.deepEqual(lexer.lex('E.'), [ operatorOutput('Existential', 0, 2) ])
  t.deepEqual(lexer.lex('∀'), [ operatorOutput('Universal') ])
  t.deepEqual(lexer.lex('A.'), [ operatorOutput('Universal', 0, 2) ])
})

test('Unrecognized symbols', t => {
  t.throws(() => lexer.lex('-'), 'Unrecognized symbol: \'-\' (at 1)')
  t.throws(() => lexer.lex('*'), 'Unrecognized symbol: \'*\' (at 1)')
})
