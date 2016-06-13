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

  static isNumeric (c) {
    return /[0-9]/.test(c)
  }

  static get symbols () {
    return Object.freeze({
      '&': 'And',
      '∧': 'And',
      '|': 'Or',
      '∨': 'Or',
      '→': 'Implication',
      '(': 'LeftParen',
      ')': 'RightParen',
      ',': 'Comma',
      '∃': 'Existential',
      '∀': 'Universal',
      '!': 'Not',
      '¬': 'Not',
      '~': 'Not',
      '1': 'True',
      '⊤': 'True',
      '0': 'False',
      '⊥': 'False'
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
    if (value.toLowerCase() === 'true') {
      token = {
        id: 'True',
        type: 'boolean',
        start: this.cursor,
        end: this.cursor + value.length
      }
    } else if (value.toLowerCase() === 'false') {
      token = {
        id: 'False',
        type: 'boolean',
        start: this.cursor,
        end: this.cursor + value.length
      }
    } else if (value[0] === value[0].toUpperCase()) {
      token = {
        id: 'Predicate',
        type: 'name',
        value,
        start: this.cursor,
        end
      }
    } else {
      token = {
        id: null,
        type: 'name',
        value,
        start: this.cursor,
        end
      }
      if (this.source.charAt(end) === '(') {
        token.id = 'FunctionExpression'
      } else {
        token.id = 'VariableOrConstant'
      }
    }
    this.cursor = end
    return token
  }

  processBoolean () {
    const c = this.source.charAt(this.cursor)
    let id = 'True'
    if (c === '⊥') id = 'False'
    if (Lexer.isNumeric(c) && (c < 1)) id = 'False'
    let symbol = {
      id,
      type: 'boolean',
      start: this.cursor,
      end: this.cursor + 1
    }
    this.cursor++
    return symbol
  }

  next () {
    this.skipWhitespace()
    if (this.cursor >= this.length) return null
    const c = this.source.charAt(this.cursor)
    const cNext = this.source.charAt(this.cursor + 1)

    if (Lexer.isNumeric(c) || c === '⊤' || c === '⊥') {
      return this.processBoolean()
    }

    if (Lexer.isAlpha(c)) {
      // Special case: quantifiers written as 'A.' and 'E.':
      if ((c === 'A' || c === 'E') && cNext === '.') {
        const symbol = {
          id: (c === 'A' ? 'Universal' : 'Existential'),
          type: 'operator',
          start: this.cursor,
          end: this.cursor + 2
        }
        this.cursor += 2
        return symbol
      } else return this.processAlpha()
    }

    // Special case: impl written as '->':
    if (c === '-' && cNext === '>') {
      const symbol = {
        id: 'Implication',
        type: 'operator',
        start: this.cursor,
        end: this.cursor + 2
      }
      this.cursor += 2
      return symbol
    }

    const id = Lexer.symbols[c]
    if (typeof id !== 'undefined') {
      const symbol = {
        id,
        type: 'operator',
        start: this.cursor,
        end: this.cursor + 1
      }
      this.cursor++
      return symbol
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
