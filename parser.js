/*
 Based on Douglas Crockford's paper on top-down operator precedence:
 http://javascript.crockford.com/tdop/tdop.html
 */

import Lexer from './lexer'

export default function makeParse () {
  const symbolTable = {}
  let token
  let tokens
  let index

  const itself = function itself () { return this }

  const advance = function advance (id) {
    if (id && token.id !== id) {
      throw new Error(`Expected ${id} (got ${token.id}).`)
    }
    if (index >= tokens.length) {
      token = symbolTable.END
      return null
    }
    const t = tokens[index]
    index += 1
    const symbol = symbolTable[t.id]
    if (!symbol) {
      if (t.type === 'operator') throw new Error('Unknown operator.')
      else throw new Error(`Unknown symbol: ${t.value}.`)
    }
    token = Object.create(symbol)
    if (t.type === 'name') {
      token.value = t.value
    }
    token.type = t.id
    token.arity = 0
    return token
  }

  const expression = function expression (rbp = 0) {
    if (token.id === 'END') return {}
    let t = token
    let left
    advance()
    left = t.nud()
    while (rbp < token.lbp) {
      t = token
      advance()
      left = t.led(left)
    }
    return left
  }

  const singleExpression = function singleExpression () {
    const t = token
    advance()
    return t.nud()
  }

  const protoSymbol = {
    nud: () => {
      throw new Error('Undefined.')
    },
    led: () => {
      throw new Error('Missing operator.')
    }
  }

  const symbol = function symbol (id, bp = 0) {
    let s = symbolTable[id]
    if (s) {
      if (bp >= s.lbp) {
        s.lbp = bp
      }
    } else {
      s = Object.create(protoSymbol)
      s.id = id
      s.value = null
      s.lbp = bp
      symbolTable[id] = s
    }
    return s
  }

  symbol('END')
  symbol('RPAREN')
  symbol('COMMA')
  symbol('TRUE').nud = itself
  symbol('FALSE').nud = itself
  symbol('VARIABLE').nud = itself
  symbol('PREDICATE').nud = function () {
    const a = []
    if (token.id === 'LPAREN') {
      advance()
      while (true) {
        if ((token.type !== 'VARIABLE') && (token.type !== 'FUNCTION')) {
          throw new Error('Function parameters should be variables, constants, or other functions')
        }
        a.push(expression())
        if (token.type !== 'COMMA') break
        advance()
      }
    }
    if (a.length) {
      this.first = a
      this.arity = a.length
    }
    return this
  }

  const infix = function infix (id, bp, led) {
    const s = symbol(id, bp)
    s.led = led || function led (left) {
      this.first = left
      this.second = expression(bp - 1)
      this.arity = 2
      return this
    }
    return s
  }

  infix('OR', 50)
  infix('AND', 50)
  infix('IMPL', 40)

  const prefix = function prefix (id, nud) {
    const s = symbol(id)
    s.nud = nud || function nud () {
      this.first = expression(70)
      this.arity = 1
      return this
    }
    return s
  }

  prefix('LPAREN', () => {
    const e = expression()
    advance('RPAREN')
    return e
  })

  prefix('FUNCTION', function func () {
    advance('LPAREN')
    const a = []
    if (token.type !== 'RPAREN') {
      while (true) {
        if ((token.type !== 'VARIABLE') && (token.type !== 'FUNCTION')) {
          throw new Error('Function parameters should be variables, constants, or other functions')
        }
        a.push(expression())
        if (token.type !== 'COMMA') break
        advance()
      }
    }
    if (a.length === 0) {
      throw new Error('Functions should have at least one argument')
    }
    this.arity = a.length
    this.first = a
    advance()
    return this
  })

  prefix('NOT')

  const quantifier = function quantifier (id, nud) {
    const s = symbol(id)
    s.nud = nud || function nud () {
      if (token.id !== 'VARIABLE') {
        throw new Error(`Expected a variable for quantification (got ${token.id})`)
      }
      this.arity = 2
      this.first = token
      advance()
      this.second = singleExpression()
      return this
    }
    return s
  }

  quantifier('EXIS')
  quantifier('UNIV')

  return function parse (source) {
    const lexer = new Lexer()
    tokens = lexer.lex(source)
    index = 0
    advance()
    return expression()
  }
}
