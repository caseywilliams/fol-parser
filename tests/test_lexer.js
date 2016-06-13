import test from 'ava'
import Lexer from '../lexer'

const lexer = new Lexer()

const operatorOutput = (id, pos = 1) => {
  return { id, type: 'operator', pos }
}
const booleanOutput = (truthy = 1, pos = 1) => {
  return {
    id: (truthy ? 'TRUE' : 'FALSE'),
    type: 'boolean',
    pos
  }
}

test('Empty statement', t => {
  t.deepEqual(lexer.lex(), [])
})

test('Predicate', t => {
  t.deepEqual(lexer.lex('P'), [{
    id: 'PREDICATE',
    type: 'name',
    value: 'P',
    pos: 1
  }])
})

test('Boolean values', t => {
  t.deepEqual(lexer.lex('⊤'), [ booleanOutput() ])
  t.deepEqual(lexer.lex('1'), [ booleanOutput() ])
  t.deepEqual(lexer.lex('True'), [ booleanOutput() ])
  t.deepEqual(lexer.lex('⊥'), [ booleanOutput(0) ])
  t.deepEqual(lexer.lex('0'), [ booleanOutput(0) ])
  t.deepEqual(lexer.lex('False'), [ booleanOutput(0) ])
})

test('Multi-character predicate names', t => {
  t.deepEqual(lexer.lex('Red | Blue'), [{
    id: 'PREDICATE',
    type: 'name',
    value: 'Red',
    pos: 1
  }, operatorOutput('OR', 5), {
    id: 'PREDICATE',
    type: 'name',
    value: 'Blue',
    pos: 7
  }])
})

test('Binary operations', t => {
  t.deepEqual(lexer.lex('∨'), [ operatorOutput('OR') ])
  t.deepEqual(lexer.lex('|'), [ operatorOutput('OR') ])
  t.deepEqual(lexer.lex('∧'), [ operatorOutput('AND') ])
  t.deepEqual(lexer.lex('&'), [ operatorOutput('AND') ])
  t.deepEqual(lexer.lex('→'), [ operatorOutput('IMPL') ])
  t.deepEqual(lexer.lex('->'), [ operatorOutput('IMPL') ])
})

test('Variable or constant', t => {
  t.deepEqual(lexer.lex('x'), [{
    id: 'VARIABLE',
    type: 'name',
    value: 'x',
    pos: 1
  }])
})

test('Function symbol', t => {
  t.deepEqual(lexer.lex('f(x)'), [
    {
      id: 'FUNCTION',
      type: 'name',
      value: 'f',
      pos: 1
    }, operatorOutput('LPAREN', 2), {
      id: 'VARIABLE',
      type: 'name',
      value: 'x',
      pos: 3
    }, operatorOutput('RPAREN', 4)
  ])
})

test('Negation', t => {
  t.deepEqual(lexer.lex('!'), [ operatorOutput('NOT') ])
  t.deepEqual(lexer.lex('¬'), [ operatorOutput('NOT') ])
  t.deepEqual(lexer.lex('~'), [ operatorOutput('NOT') ])
})

test('Parentheses', t => {
  t.deepEqual(lexer.lex('('), [ operatorOutput('LPAREN') ])
  t.deepEqual(lexer.lex(')'), [ operatorOutput('RPAREN') ])
})

test('Quantifiers', t => {
  t.deepEqual(lexer.lex('∃'), [ operatorOutput('EXIS') ])
  t.deepEqual(lexer.lex('E.'), [ operatorOutput('EXIS') ])
  t.deepEqual(lexer.lex('∀'), [ operatorOutput('UNIV') ])
  t.deepEqual(lexer.lex('A.'), [ operatorOutput('UNIV') ])
})

test('Unrecognized symbols', t => {
  t.throws(() => lexer.lex('-'), 'Unrecognized symbol: \'-\' (at 1)')
  t.throws(() => lexer.lex('*'), 'Unrecognized symbol: \'*\' (at 1)')
})
