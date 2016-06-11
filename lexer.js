/*
 Based on Eli Bendersky's article on writing lexers in Javascript:
 http://eli.thegreenplace.net/2013/07/16/hand-written-lexer-in-javascript-compared-to-the-regex-based-ones
 */

class Lexer {
  constructor (input) {
    this.source = input
    this.cursor = 0
    this.length = input.length
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
        pos: this.cursor
      }
    } else {
      token = {
        id: null,
        type: 'name',
        value,
        pos: this.cursor
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
          value: '->',
          pos: this.cursor
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
        value: c,
        pos: this.cursor++
      }
    }
    if (Lexer.isAlpha(c)) {
      return this.processAlpha()
    }
    return null
  }

  done () {
    return !this.source.charAt(this.cursor + 1)
  }

  tokenize () {
    const oldCursor = this.cursor
    this.cursor = 0
    const tokens = []
    let t
    while (t = this.next()) {
      tokens.push(t)
    }
    this.cursor = oldCursor
    return tokens
  }
}

module.exports = Lexer
