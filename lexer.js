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

  get done () {
    return this.length === this.cursor
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
    const cNext = this.source.charAt(this.cursor + 1)

    if (Lexer.isAlpha(c)) {
      // Special case: quantifiers written as 'A.' and 'E.':
      if ((c === 'A' || c === 'E') && cNext === '.') {
        const symbol = {
          id: (c === 'A' ? 'UNIV' : 'EXIS'),
          type: 'operator',
          pos: this.cursor + 1
        }
        this.cursor += 2
        return symbol
      } else return this.processAlpha()
    }

    // Special case: impl written as '->':
    if (c === '-' && cNext === '>') {
      const symbol = {
        id: 'IMPL',
        type: 'operator',
        pos: this.cursor + 1
      }
      this.cursor += 2
      return symbol
    }

    const id = Lexer.symbols[c]
    if (typeof id !== 'undefined') {
      return {
        id,
        type: 'operator',
        pos: (this.cursor++ + 1)
      }
    } else {
      throw new Error(`Unrecognized symbol: '${c}' (at ${this.cursor + 1})`)
    }
  }

  lex (input) {
    if (!input) return []
    this.source = input
    this.length = input.length
    const out = []
    while (!this.done) {
      out.push(this.next())
    }
    this.cursor = 0
    return out
  }

}

module.exports = Lexer
