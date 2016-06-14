/*
 Based on Eli Bendersky's article on writing lexers in Javascript:
 http://eli.thegreenplace.net/2013/07/16/hand-written-lexer-in-javascript-compared-to-the-regex-based-ones
 */

function isAlpha (c) {
  return /[A-Za-z]/.test(c)
}

function isNumeric (c) {
  return /[0-9]/.test(c)
}

const symbols = {
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
}

function Lexer () {
  let cursor = 0
  let source = ''
  let length = 0

  const done = () => length === cursor

  function skipWhitespace () {
    let char
    while (!done()) {
      char = source.charAt(cursor)
      if (/\s/.test(char)) {
        ++cursor
      } else break
    }
  }

  function processAlpha () {
    // Special case: quantifiers written as 'A.' and 'E.':
    const char = source.charAt(cursor)
    if (char === 'A' || char === 'E') {
      if (source.charAt(cursor + 1) === '.') {
        const token = {
          id: (char === 'A' ? 'Universal' : 'Existential'),
          type: 'operator',
          start: cursor,
          end: cursor + 2
        }
        cursor += 2
        return token
      }
    }

    let end = cursor + 1
    while (end < length && isAlpha(source.charAt(end))) ++end
    const value = source.substring(cursor, end)
    let token = {
      start: cursor,
      end
    }

    if (value.toLowerCase() === 'true') {
      token.id = 'True'
      token.type = 'boolean'
    } else if (value.toLowerCase() === 'false') {
      token.id = 'False'
      token.type = 'boolean'
    } else if (value[0] === value[0].toUpperCase()) {
      token.id = 'Predicate'
      token.type = 'name'
      token.value = value
    } else if (source.charAt(end) === '(') {
      token.id = 'FunctionExpression'
      token.type = 'name'
      token.value = value
    } else {
      token.id = 'VariableOrConstant'
      token.type = 'name'
      token.value = value
    }

    cursor = end
    return token
  }

  function processBoolean () {
    const char = source.charAt(cursor)
    let id = 'True'
    if (char === '⊥') id = 'False'
    if (isNumeric(char) && (char < 1)) id = 'False'
    const token = {
      id,
      type: 'boolean',
      start: cursor,
      end: cursor + 1
    }
    ++cursor
    return token
  }

  function next () {
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
      const token = {
        id: 'Implication',
        type: 'operator',
        start: cursor,
        end: cursor + 2
      }
      cursor += 2
      return token
    }

    const symbolId = symbols[char]
    if (typeof symbolId !== 'undefined') {
      const token = {
        id: symbolId,
        type: 'operator',
        start: cursor,
        end: cursor + 1
      }
      ++cursor
      return token
    } else {
      throw new Error(`Unrecognized symbol: '${char}' (at ${cursor + 1})`)
    }
  }

  return function tokenize (input) {
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

export default new Lexer()
