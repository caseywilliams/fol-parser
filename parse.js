/*
 Based on Douglas Crockford's paper on top-down operator precedence:
 http://javascript.crockford.com/tdop/tdop.html
 */

import tokenize from './tokenize'

function Parser () {
  const symbolTable = {}
  let token
  let tokens
  let index

  const baseSymbol = {
    nud () {
      throw new Error('Undefined.')
    },
    led () {
      throw new Error('Missing operator.')
    }
  }

  function createSymbol (id, bp = 0) {
    let s = symbolTable[id]
    if (s) {
      if (bp >= s.lbp) {
        s.lbp = bp
      }
    } else {
      s = Object.create(baseSymbol)
      s.id = id
      s.lbp = bp
      symbolTable[id] = s
    }
    return s
  }

  createSymbol('End')

  createSymbol('RightParen')

  createSymbol('Comma')

  createSymbol('VariableOrConstant').nud = function nud () {
    return this
  }

  createSymbol('True').nud = function nud () {
    this.type = 'Literal'
    this.value = true
    return this
  }

  createSymbol('False').nud = function nud () {
    this.type = 'Literal'
    this.value = true
    return this
  }

  createSymbol('Predicate').nud = function nud () {
    const a = []
    if (token.id === 'LeftParen') {
      let e
      advance()
      if (token.id !== 'RightParen') {
        while (true) {
          if ((token.type !== 'VariableOrConstant') && (token.type !== 'FunctionExpression')) {
            throw new Error('Function parameters should be variables, constants, or other functions')
          }
          e = expression()
          this.end = e.end
          a.push(e)
          if (token.type !== 'Comma') break
          advance()
        }
      }
      advance('RightParen')
      this.end++
    }
    this.arguments = a
    return this
  }

  function createInfix (id, bp, led) {
    const s = createSymbol(id, bp)
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

  createInfix('Disjunction', 50)

  createInfix('Conjunction', 50)

  createInfix('Implication', 40)

  function createPrefix (id, nud) {
    const s = createSymbol(id)
    s.nud = nud || function nud () {
      this.type = 'UnaryExpression'
      this.operator = id
      this.argument = expression(70)
      this.end = this.argument.end
      return this
    }
    return s
  }

  createPrefix('Negation')

  createPrefix('LeftParen', function nud () {
    this.type = 'ExpressionStatement'
    const e = expression()
    advance('RightParen')
    this.end = e.end + 1
    this.expression = e
    return this
  })

  createPrefix('FunctionExpression', function nud () {
    advance('LeftParen')
    const a = []
    let e
    this.end = this.start
    if (token.id !== 'RightParen') {
      while (true) {
        if ((token.type !== 'VariableOrConstant') && (token.type !== 'FunctionExpression')) {
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

  function createQuantifier (id, nud) {
    const s = createSymbol(id)
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

  createQuantifier('Existential')

  createQuantifier('Universal')
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
    const s = symbolTable[t.id]
    if (!s) {
      if (t.type === 'operator') throw new Error('Unknown operator.')
      else throw new Error(`Unknown symbol: ${t.value}.`)
    }
    token = Object.create(s)
    if (t.type === 'name') {
      token.name = t.value
    }
    token.type = t.id
    token.start = t.start
    token.end = t.end
    return token
  }

  function expression (rbp = 0) {
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

  function singleExpression () {
    const t = token
    advance()
    return t.nud()
  }

  return function parse (source) {
    tokens = tokenize(source)
    index = 0
    advance()
    return expression()
  }
}

export default new Parser()
