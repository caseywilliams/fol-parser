/*
 Based on Eli Bendersky's article on writing lexers in Javascript:
 http://eli.thegreenplace.net/2013/07/16/hand-written-lexer-in-javascript-compared-to-the-regex-based-ones
 */

class Lexer {
  constructor () {
    this.source = null
    this.cursor = 0
    this.length = 0
  }

  static isAlpha (c) {
    return /[A-Za-z]/.test(c)
  }

  static get symbols () {
    return Object.freeze({
      '&': 'AND',
      '∧': 'AND',
      '|': 'OR',
      '∨': 'OR',
      '→': 'IMPL',
      '(': 'LPAREN',
      ')': 'RPAREN',
      ',': 'COMMA',
      '∃': 'EXIS',
      '∀': 'UNIV',
      '!': 'NOT',
      '¬': 'NOT',
      '~': 'NOT'
    })
  }

  skipWhitespace () {
    let c
    while (this.cursor < this.length) {
      c = this.source.charAt(this.cursor)
      if (/\s/.test(c)) {
        this.cursor++
      } else break
    }
  }

  processAlpha () {
    let token
    let end = this.cursor + 1
    while (end < this.length && Lexer.isAlpha(this.source.charAt(end))) {
      end++
    }
    const value = this.source.substring(this.cursor, end)
    if (value[0] === value[0].toUpperCase()) {
      token = {
        id: 'PREDICATE',
        type: 'name',
        value,
        pos: this.cursor + 1
      }
    } else {
      token = {
        id: null,
        type: 'name',
        value,
        pos: this.cursor + 1
      }
      if (this.source.charAt(end) === '(') {
        token.id = 'FUNCTION'
      } else {
        token.id = 'VARIABLE'
      }
    }
    this.cursor = end
    return token
  }

  next () {
    this.skipWhitespace()
    if (this.cursor >= this.length) return null
    const c = this.source.charAt(this.cursor)

    // Special case: impl written as '->':
    if (c === '-') {
      const peekChar = this.source.charAt(this.cursor + 1)
      if (peekChar === '>') {
        const symbol = {
          id: 'IMPL',
          type: 'operator',
          pos: this.cursor + 1
        }
        this.cursor += 2
        return symbol
      }
      throw Error('Token error: unexpected \'-\'')
    }
    const symbol = Lexer.symbols[c]
    if (symbol !== undefined) {
      return {
        id: symbol,
        type: 'operator',
        pos: (this.cursor++ + 1)
      }
    }
    if (Lexer.isAlpha(c)) {
      return this.processAlpha()
    }
    return null
  }

  lex (input) {
    let t
    this.source = input
    this.length = input.length
    this.cursor = 0
    const out = []
    while (t = this.next()) {
      out.push(t)
    }
    this.cursor = 0
    return out
  }

}

module.exports = Lexer
