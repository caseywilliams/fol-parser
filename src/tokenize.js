/*
 Based on Eli Bendersky's article on writing lexers in Javascript:
 http://eli.thegreenplace.net/2013/07/16/hand-written-lexer-in-javascript-compared-to-the-regex-based-ones
 */

const symbols = Object.freeze({
  0: 'False',
  1: 'True',
  ',': 'Comma',
  '&': 'Conjunction',
  '∧': 'Conjunction',
  '|': 'Disjunction',
  '∨': 'Disjunction',
  '∃': 'Existential',
  '⊥': 'False',
  '→': 'Implication',
  '(': 'LeftParen',
  '~': 'Negation',
  '¬': 'Negation',
  '!': 'Negation',
  ')': 'RightParen',
  '⊤': 'True',
  '∀': 'Universal',
})

const isAlpha = (char) => /[A-Za-z]/.test(char)
const isNumeric = (char) => /[0-9]/.test(char)
const isWhitespace = (char) => /\s/.test(char)

const createToken = (symbolOrId, type, cursor, end = cursor + 1, value = null) => {
  const obj = {
    id: symbols[symbolOrId] || symbolOrId,
    start: cursor,
    type,
    end,
  }
  if (value) obj.value = value
  return Object.freeze(obj)
}

function Lexer () {
  let cursor = 0
  let length = 0
  let source = ''

  const done = () => length === cursor

  const skipWhitespace = () => {
    let char
    while (!done()) {
      char = source.charAt(cursor)
      if (isWhitespace(char)) {
        ++cursor
      } else break
    }
  }

  // Process one or more alpha characters
  const processAlpha = () => {
    const char = source.charAt(cursor)

    // Special case: quantifiers may be written as ASCII 'A.' and 'E.':
    if (source.charAt(cursor + 1) === '.') {
      if (char === 'A') {
        cursor += 2
        return createToken('Universal', 'operator', cursor - 2, cursor)
      } else if (char === 'E') {
        cursor += 2
        return createToken('Existential', 'operator', cursor - 2, cursor)
      }
    }

    // Determine the end of a string of alpha chars, if one can be found:
    const start = cursor
    const matches = source.substring(cursor).match(/^([A-Za-z]+)/)
    cursor += matches[1].length
    const stringValue = source.substring(start, cursor)

    if (stringValue.toLowerCase() === 'true') {
      return createToken('True', 'boolean', start, cursor)
    } else if (stringValue.toLowerCase() === 'false') {
      return createToken('False', 'boolean', start, cursor)
    } else if (stringValue[0] === stringValue[0].toUpperCase()) {
      return createToken('Predicate', 'name', start, cursor, stringValue)
    } else if (source.charAt(cursor) === '(') {
      return createToken('FunctionExpression', 'name', start, cursor, stringValue)
    } else {
      return createToken('VariableOrConstant', 'name', start, cursor, stringValue)
    }
  }

  const processBoolean = () => {
    return createToken(source.charAt(cursor), 'boolean', cursor++)
  }

  const next = () => {
    skipWhitespace()
    if (done()) return null
    const char = source.charAt(cursor)
    const nextChar = source.charAt(cursor + 1)

    if (isNumeric(char) || char === '⊤' || char === '⊥') {
      return processBoolean()
    }

    if (isAlpha(char)) {
      return processAlpha()
    }

    // Special case: impl written as '->':
    if (char === '-' && nextChar === '>') {
      cursor += 2
      return createToken('Implication', 'operator', cursor - 2, cursor)
    }

    // The rest of the possibilities at this point are all single-character operators:
    if (typeof symbols[char] === 'undefined') {
      throw new Error(`Unrecognized symbol: '${char}' (at ${cursor + 1})`)
    }

    return createToken(symbols[char], 'operator', cursor++)
  }

  // Tokenizes an input string
  return (input) => {
    if (typeof input === 'undefined') return []
    source = String(input)
    length = source.length
    const tokens = []
    while (!done()) {
      tokens.push(next())
    }
    cursor = 0
    return tokens
  }
}

module.exports = new Lexer()
