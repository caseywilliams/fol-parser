import test from 'ava'
import Lexer from '../lexer'

const lexer = new Lexer()
const operatorOutput = (id, pos = 1) => {
  return { id, type: 'operator', pos }
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
  t.deepEqual(lexer.lex('∀'), [ operatorOutput('UNIV') ])
})

test('Unrecognized symbols', t => {
  t.throws(() => lexer.lex('-'), 'Unrecognized symbol: \'-\' (at 1)')
  t.throws(() => lexer.lex('*'), 'Unrecognized symbol: \'*\' (at 1)')
})
