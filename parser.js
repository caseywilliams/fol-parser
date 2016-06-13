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
      token = symbolTable.End
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
      token.name = t.value
    }
    token.start = t.start
    token.end = t.end
    token.type = t.id
    return token
  }

  const expression = function expression (rbp = 0) {
    if (token.id === 'End') return {}
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
      s.lbp = bp
      symbolTable[id] = s
    }
    return s
  }

  symbol('End')
  symbol('RightParen')
  symbol('Comma')
  symbol('VariableOrConstant').nud = itself
  symbol('True').nud = function () {
    this.type = 'Literal'
    this.value = true
    return this
  }
  symbol('False').nud = function () {
    this.type = 'Literal'
    this.value = true
    return this
  }
  symbol('Predicate').nud = function () {
    const a = []
    if (token.id === 'LeftParen') {
      advance()
      while (true) {
        if ((token.type !== 'VariableOrConstant') && (token.type !== 'FunctionExpression')) {
          throw new Error('Function parameters should be variables, constants, or other functions')
        }
        a.push(expression())
        if (token.type !== 'Comma') break
        advance()
      }
    }
    this.arguments = a
    return this
  }

  const infix = function infix (id, bp, led) {
    const s = symbol(id, bp)
    s.led = led || function led (left) {
      this.type = 'BinaryExpression'
      this.operator = id
      this.left = left
      this.right = expression(bp - 1)
      this.start = this.left.start
      this.end = this.right.end
      return this
    }
    return s
  }

  infix('Or', 50)
  infix('And', 50)
  infix('Implication', 40)

  const prefix = function prefix (id, nud) {
    const s = symbol(id)
    s.nud = nud || function nud () {
      this.type = 'UnaryExpression'
      this.operator = id
      this.argument = expression(70)
      this.end = this.argument.end
      return this
    }
    return s
  }

  prefix('LeftParen', function nud () {
    this.type = 'ExpressionStatement'
    const e = expression()
    advance('RightParen')
    this.end = e.end + 1
    this.expression = e
    return this
  })

  prefix('FunctionExpression', function nud () {
    advance('LeftParen')
    const a = []
    let e
    this.end = this.start
    if (token.id !== 'RightParen') {
      while (true) {
        if ((token.id !== 'VariableOrConstant') && (token.id !== 'FunctionExpression')) {
          throw new Error('Function parameters should be variables, constants, or other functions')
        }
        e = expression()
        this.end = e.end
        a.push(e)
        if (token.id !== 'Comma') break
        advance()
      }
    }
    if (a.length === 0) {
      throw new Error('Functions should have at least one argument')
    }
    this.arguments = a
    advance('RightParen')
    this.end++
    return this
  })

  prefix('Not')

  const quantifier = function quantifier (id, nud) {
    const s = symbol(id)
    s.nud = nud || function nud () {
      this.type = 'QuantifiedExpression'
      this.quantifier = id
      if (token.id !== 'VariableOrConstant') {
        throw new Error(`Expected a variable for quantification (got ${token.id})`)
      }
      this.variable = singleExpression()
      this.expression = singleExpression()
      this.end = this.expression.end
      return this
    }
    return s
  }

  quantifier('Existential')
  quantifier('Universal')

  return function parse (source) {
    const lexer = new Lexer()
    tokens = lexer.lex(source)
    index = 0
    advance()
    return expression()
  }
}
