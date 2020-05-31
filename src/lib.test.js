const lib = require('./lib')
const parse = require('./parse')

const negate = (s) => lib.stringify(lib.negate(parse(s)))
const collapseNegations = (s) => lib.stringify(lib.collapseNegations(parse(s)))
const removeImplications = (s) => lib.stringify(lib.removeImplications(parse(s)))
const collectNames = (s) => lib.collectNames(parse(s))
const markFree = (s) => lib.markFree(parse(s))
const containsFree = (s, x) => lib.containsFree(parse(s), x)
const moveQuantifiersLeft = (s) => lib.stringify(lib.moveQuantifiersLeft(parse(s)))

describe('lib', () => {
  describe('stringify', () => {
    describe.each([
      ['VariableOrConstant', 'x'],
      ['Predicate', 'P'],
      ['Predicate with argument', 'P(x)'],
      ['Predicate with arguments', 'P(x, y)'],
      ['FunctionExpression with argument', 'f(x)'],
      ['FunctionExpression with arguments', 'f(x, y)'],
      ['Conjunction', 'P & Q'],
      ['Disjunction', 'P | Q'],
      ['Implication', 'P -> Q'],
      ['ExpressionStatement', '(P)'],
      ['UnaryExpression', '!P'],
      ['QuantifiedExpression', 'A.x f(x)']
    ])('stringify %s', (name, str) => {
      expect(lib.stringify(parse(str))).toEqual(str)
    })

    test('longer expression', () => {
      const s = 'E.x f(x) | A.y (!Q -> P(y, z)) & R'
      expect(lib.stringify(parse(s))).toEqual(s)
    })
  })

  describe('negate', () => {
    describe.each([
      ['VariableOrConstant', 'x', '!x'],
      ['Predicate', 'P', '!P'],
      ['Predicate with arguments', 'P(x, y)', '!P(x, y)'],
      ['FunctionExpression', 'f(x, y)', '!f(x, y)'],
      ['Conjunction', 'P & Q', '!P | !Q'],
      ['Disjunction', 'P | Q', '!P & !Q'],
      ['Implication', 'P -> Q', 'P & !Q'],
      ['Quantifier existential', 'A.x f(x)', 'E.x !f(x)'],
      ['Quantifier universal', 'E.x f(x)', 'A.x !f(x)']
    ])('negate %s', (name, input, output) => {
      expect(negate(input)).toEqual(output)
    })

    test('Negation opration negates only the top "level" of an expression', () => {
      expect(negate('P | Q & R -> S')).toEqual('P | Q & R & !S')
    })

    test('Negation operation does not attempt to collapse multiple negations', () => {
      expect(negate('!!!Q')).toEqual('!!Q')
    })

    test('Negation is applied within negated expression statements', () => {
      expect(negate('(f(x))')).toEqual('(!f(x))')
    })

    test('Negation does not permanently alter the formula object', () => {
      const s = 'A.y P(f(y), z) | !!Q(x) & E.y !!!Q(y) -> (!Q & P)'
      const obj = parse(s)
      lib.negate(obj)
      expect(lib.stringify(obj)).toEqual(s)
    })
  })

  describe('collapseNegations', () => {
    test('does not affect already collapsed expressions', () => {
      expect(collapseNegations('P')).toEqual('P')
      expect(collapseNegations('!P')).toEqual('!P')
    })

    test('collapses multiple negations', () => {
      expect(collapseNegations('!!!P')).toEqual('!P')
      expect(collapseNegations('!!!!P')).toEqual('P')
    })

    test('Negation collapse collapses argument negations for predicates and functions', () => {
      expect(collapseNegations('P(!!!f(x))')).toEqual('P(!f(x))')
      expect(collapseNegations('f(!!g(x))')).toEqual('f(g(x))')
    })

    test('Negation collapse collapses both a function/predicate and its arguments', () => {
      const result = collapseNegations('!!P(!!!f(x), !!g(x))')
      expect(collapseNegations('!!P(!!!f(x), !!g(x))')).toEqual('P(!f(x), g(x))')
    })

    test('Negation collapse collapses both sides of binary expressions', () => {
      expect(collapseNegations('!!P -> !!!Q')).toEqual('P -> !Q')
    })

    test('Negation collapse applies an outside negation to the inside of an expression statement', () => {
      expect(collapseNegations('!(P)')).toEqual('(!P)')
    })

    test('Negation collapse applies an outside negation to a quantified expression', () => {
      expect(collapseNegations('!A.x f(x)')).toEqual('E.x !f(x)')
    })

    test('Negation collapse collapses multiply negated quantified expressions', () => {
      expect(collapseNegations('A.x !!f(x)')).toEqual('A.x f(x)')
    })

    test('Negation collapse does not permanently alter the formula object', () => {
      const s = '!!!A.y !!!P(!!!f(y), z) | !!!Q(x) & !!E.y !!Q(y) -> !!!(!!!Q & !!P)'
      const obj = parse(s)
      lib.collapseNegations(obj)
      expect(lib.stringify(obj)).toEqual(s)
    })
  })

  describe('removeImplications', () => {
    test('Implications can be removed', () => {
      expect(removeImplications('P -> Q')).toEqual('!P | Q')
    })

    test('Implications can be removed within expression statements', () => {
      expect(removeImplications('(P -> Q)')).toEqual('(!P | Q)')
    })

    test('Implication removal is fully applied throughout an expression', () => {
      expect(removeImplications('(P -> Q) -> (R -> S)')).toEqual('(P & !Q) | (!R | S)')
    })

    test('Implication removal works correctly when either side is a quantified expression', () => {
      expect(removeImplications('A.x f(x) -> E.y g(y)')).toEqual('E.x !f(x) | E.y g(y)')
    })

    test('Implication removal works correctly within a quantified expression', () => {
      expect(removeImplications('A.x (f(x) -> g(y))')).toEqual('A.x (!f(x) | g(y))')
    })

    test('Implication removal does not permanently alter the formula object', () => {
      const s = 'A.x (f(x) -> g(x)) -> P(f(x), y) | (P -> Q)'
      const obj = parse(s)
      lib.removeImplications(obj)
      expect(lib.stringify(obj)).toEqual(s)
    })
  })

  describe('collectNames', () => {
    test('Collect names from functions', () => {
      expect(collectNames('f(x, g(y, z))')).toEqual({
        f: 'FunctionExpression',
        x: 'VariableOrConstant',
        g: 'FunctionExpression',
        y: 'VariableOrConstant',
        z: 'VariableOrConstant'
      })
    })

    test('Collect names from predicates', () => {
      expect(collectNames('P(x, g(y, z))')).toEqual({
        x: 'VariableOrConstant',
        g: 'FunctionExpression',
        y: 'VariableOrConstant',
        z: 'VariableOrConstant'
      })
    })

    test('Collect names from binary expressions', () => {
      expect(collectNames('f(x) | g(y)')).toEqual({
        f: 'FunctionExpression',
        x: 'VariableOrConstant',
        g: 'FunctionExpression',
        y: 'VariableOrConstant'
      })
    })

    test('Collect names from quantified expressions', () => {
      expect(collectNames('A.x f(x)')).toEqual({
        x: 'VariableOrConstant',
        f: 'FunctionExpression'
      })
    })

    test('Collect names from expression statements', () => {
      expect(collectNames('(P(x))')).toEqual({
        x: 'VariableOrConstant'
      })
    })

    test('Collect names from negated expressions', () => {
      expect(collectNames('!f(x)')).toEqual({
        f: 'FunctionExpression',
        x: 'VariableOrConstant'
      })
    })

    test('Throw an error if a function with the same name as a variable is encountered', () => {
      expect(() => {
        collectNames('f(x) | g(f)')
      }).toThrow(/'f'/)
    })
  })

  describe('markFree', () => {
    test('Mark free variables in quantified expressions', () => {
      const marked = markFree('A.x f(x, y, g(y))')
      expect(marked.variable.free).toEqual(false)
      expect(marked.expression.arguments[0].free).toEqual(false)
      expect(marked.expression.arguments[1].free).toEqual(true)
      expect(marked.expression.arguments[2].arguments[0].free).toEqual(true)
    })

    test('Mark free variables in nested quantified expressions', () => {
      const marked = markFree('A.x E.y (f(x) | !P(x, y, z))')
      const expr = marked.expression.expression.expression // f(x) | !P(x, y, z)
      expect(expr.left.arguments[0].free).toEqual(false)
      expect(expr.right.argument.arguments[0].free).toEqual(false)
      expect(expr.right.argument.arguments[1].free).toEqual(false)
      expect(expr.right.argument.arguments[2].free).toEqual(true)
    })
  })

  describe('containsFree', () => {
    test('Determine whether a variable appears free in a function', () => {
      expect(containsFree('A.y f(x, y)', 'x')).toEqual(true)
      expect(containsFree('A.x f(x, y)', 'x')).toEqual(false)
      expect(containsFree('A.x f(y, z)', 'x')).toEqual(false)
    })

    test('Determine whether a variable appears free in a binary expression', () => {
      expect(containsFree('A.y P(x, y) | E.x Q(x, y)', 'y')).toEqual(true)
      expect(containsFree('A.y P(x, y) | E.x Q(x, y)', 'x')).toEqual(true)
      expect(containsFree('P(x) | A.x Q(x)', 'x')).toEqual(true)
    })

    test('Determine whether a variable appears free in a negated expression', () => {
      expect(containsFree('!A.y P(x, y)', 'x')).toEqual(true)
    })

    test('Determine whether a variable appears free in an expression statement', () => {
      expect(containsFree('!A.y (P(x, y) | f(x))', 'x')).toEqual(true)
    })
  })

  describe('moveQuantifiersLeft', () => {
    test('Quantifiers are moved left in binary expressions where appropriate', () => {
      expect(
        moveQuantifiersLeft('P(y) | A.x Q(x)')
      ).toEqual('A.x (P(y) | Q(x))')
    })

    test('Quantifiers are not moved left when the quantified variable appears free at the left of a binary expression', () => {
      expect(
        moveQuantifiersLeft('P(x) | A.x Q(x)')
      ).toEqual('P(x) | A.x Q(x)')
    })

    test('Move quantifiers left with multiple quantifiers', () => {
      expect(
        moveQuantifiersLeft('A.z h(z) & E.w k(w)')
      ).toEqual('A.z E.w (h(z) & k(w))')

      expect(
        moveQuantifiersLeft('E.x f(x) & A.y g(y) | A.z h(z)')
      ).toEqual('E.x A.y A.z (f(x) & g(y) | h(z))')

      expect(
        moveQuantifiersLeft('E.x f(x) & A.y g(y) | A.z h(z) & E.w k(w)')
      ).toEqual('E.x A.y A.z E.w (f(x) & g(y) | h(z) & k(w))')
    })

    test('Move quantifiers left with quantifiers first', () => {
      expect(
        moveQuantifiersLeft('A.x A.y (f(x, y) | E.z (f(x, z) & f(y, z)))')
      ).toEqual('A.x A.y E.z (f(x, y) | f(x, z) & f(y, z))')
    })

    test('Parens are maintained when appropriate while moving quantifiers left', () => {
      expect(
        moveQuantifiersLeft('A.z (P(x) & (!Q(z) | E.y R(z, y) | A.w !P(w)))')
      ).toEqual('A.z E.y A.w (P(x) & (!Q(z) | R(z, y) | !P(w)))')

      expect(
        moveQuantifiersLeft('A.z ((P(x) | R(x)) & (!Q(z) | E.y R(z, y) | A.w !P(w)))')
      ).toEqual('A.z E.y A.w ((P(x) | R(x)) & (!Q(z) | R(z, y) | !P(w)))')
    })

    test('Moving quantifiers left does not permanently alter the formula object', () => {
      const s = 'A.y P(f(y), z) | (E.x !!Q(x) & E.y !!!Q(y) -> A.x f(x))'
      const obj = parse(s)
      lib.moveQuantifiersLeft(obj)
      expect(lib.stringify(obj)).toEqual(s)
    })
  })
})
