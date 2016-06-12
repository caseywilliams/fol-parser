/*
 Based on Douglas Crockford's paper on top-down operator precedence:
 http://javascript.crockford.com/tdop/tdop.html
 */

import Lexer from './lexer'

export default function makeParse () {
  const symbolTable = {}
  let token
  let tokens
  let tokenCount

  const itself = function itself () { return this }

  const advance = function advance (id) {
    if (id && token.id !== id) {
      throw new Error(`Expected ${id}.`)
    }
    if (tokenCount >= tokens.length) {
      token = symbolTable.END
      return null
    }
    const t = tokens[tokenCount]
    tokenCount += 1
    const v = t.value
    const o = symbolTable[t.id]
    if (!o) {
      if (t.type === 'operator') throw new Error('Unknown operator.')
      else throw new Error(`Unknown symbol: ${v}.`)
    }
    token = Object.create(o)
    if (t.type === 'name') {
      token.value = v
    }
    token.type = t.id
    token.arity = 0
    return token
  }

  const expression = function expression (rbp) {
    const _rbp = rbp || 0
    let t = token
    let left
    advance()
    left = t.nud()
    while (_rbp < token.lbp) {
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

  /**
   * Creates a symbol given a token ID and a binding power
   */
  const symbol = function symbol (id, bp) {
    let s = symbolTable[id]
    const _bp = bp || 0
    if (s) {
      if (_bp >= s.lbp) {
        s.lbp = _bp
      }
    } else {
      s = Object.create(protoSymbol)
      s.id = id
      s.value = null
      s.lbp = _bp
      symbolTable[id] = s
    }
    return s
  }

  symbol('END')
  symbol('PREDICATE').nud = itself
  symbol('VARIABLE').nud = itself
  symbol('RPAREN')
  symbol('COMMA')

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
    const a = []
    if (token.id === 'name') {
      this.name = token.value
      advance()
    }
    advance()
    if (token.value !== ')') {
      while (true) {
        if (token.arity !== 'name') {
          throw new Error('Expected a parameter name')
        }
        a.push(expression())
        if (token.value !== ',') {
          break
        }
        advance()
      }
    }
    this.first = a
    advance()
    return this
  })

  prefix('NOT')

  const quantifier = function quantifier (id, nud) {
    const s = symbol(id)
    s.nud = nud || function nud () {
      if (token.id !== 'VARIABLE') {
        throw new Error(`Expected a variable for quantification Got ${token.id}.`)
      }
      this.arity = 2
      this.first = token.value
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
    tokenCount = 0
    advance()
    const s = expression()
    advance('END')
    return s
  }
}
