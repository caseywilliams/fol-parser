const test = require('ava')
const lib = require('../lib')
const parse = require('../parse')

const negate = (s) => lib.stringify(lib.negate(parse(s)))
const collapseNegations = (s) => lib.stringify(lib.collapseNegations(parse(s)))
const removeImplications = (s) => lib.stringify(lib.removeImplications(parse(s)))
const collectNames = (s) => lib.collectNames(parse(s))
const markFree = (s) => lib.markFree(parse(s))
const containsFree = (s, x) => lib.containsFree(parse(s), x)
const moveQuantifiersLeft = (s) => lib.stringify(lib.moveQuantifiersLeft(parse(s)))

test('Basic string output', t => {
  const s = 'E.x f(x) | A.y (!Q -> P(y, z)) & R'
  t.is(lib.stringify(parse(s)), s)
})

test('Variables/constants can be negated', t => {
  t.is(negate('x'), '!x')
})

test('Functions can be negated', t => {
  t.is(negate('f(x)'), '!f(x)')
})

test('Predicates can be negated', t => {
  t.is(negate('P(x)'), '!P(x)')
})

test('Binary expressions can be negated', t => {
  t.is(negate('P | Q'), '!P & !Q')
  t.is(negate('P & Q'), '!P | !Q')
  t.is(negate('P -> Q'), 'P & !Q')
})

test('Quantifiers can be negated', t => {
  t.is(negate('A.x f(x)'), 'E.x !f(x)')
  t.is(negate('E.x f(x)'), 'A.x !f(x)')
})

test('Negation of a negated expression returns the expression unchanged', t => {
  t.is(negate('!P'), 'P')
})

test('Negation by itself negates only the top "level" of an expression', t => {
  t.is(negate('P | Q & R -> S'), 'P | Q & R & !S')
})

test('Negation operation does not attempt to collapse multiple negations', t => {
  t.is(negate('!!!Q'), '!!Q')
})

test('Negation is applied within negated expression statements', t => {
  t.is(negate('(f(x))'), '(!f(x))')
})

test('Negation does not permanently alter the formula object', t => {
  const s = 'A.y P(f(y), z) | !!Q(x) & E.y !!!Q(y) -> (!Q & P)'
  const obj = parse(s)
  lib.negate(obj)
  t.is(lib.stringify(obj), s)
})

test('Negation collapse does not affect already collapsed expressions', t => {
  t.is(collapseNegations('P'), 'P')
  t.is(collapseNegations('!P'), '!P')
})

test('Negation collapse collapses many negations', t => {
  t.is(collapseNegations('!!!P'), '!P')
  t.is(collapseNegations('!!!!P'), 'P')
})

test('Negation collapse collapses argument negations for predicates and functions', t => {
  t.is(collapseNegations('P(!!!f(x))'), 'P(!f(x))')
  t.is(collapseNegations('f(!!g(x))'), 'f(g(x))')
})

test('Negation collapse collapses both a function/predicate and its arguments', t => {
  t.is(collapseNegations('!!P(!!!f(x), !!g(x))'), 'P(!f(x), g(x))')
})

test('Negation collapse collapses both sides of binary expressions', t => {
  t.is(collapseNegations('!!P -> !!!Q'), 'P -> !Q')
})

test('Negation collapse applies an outside negation to the inside of an expression statement', t => {
  t.is(collapseNegations('!(P)'), '(!P)')
})

test('Negation collapse applies an outside negation to a quantified expression', t => {
  t.is(collapseNegations('!A.x f(x)'), 'E.x !f(x)')
})

test('Negation collapse collapses multiply negated quantified expressions', t => {
  t.is(collapseNegations('A.x !!f(x)'), 'A.x f(x)')
})

test('Negation collapse does not permanently alter the formula object', t => {
  const s = '!!!A.y !!!P(!!!f(y), z) | !!!Q(x) & !!E.y !!Q(y) -> !!!(!!!Q & !!P)'
  const obj = parse(s)
  lib.collapseNegations(obj)
  t.is(lib.stringify(obj), s)
})

test('Implications can be removed', t => {
  t.is(removeImplications('P -> Q'), '!P | Q')
})

test('Implications can be removed within expression statements', t => {
  t.is(removeImplications('(P -> Q)'), '(!P | Q)')
})

test('Implication removal is fully applied throughout an expression', t => {
  t.is(removeImplications('(P -> Q) -> (R -> S)'), '(P & !Q) | (!R | S)')
})

test('Implication removal works correctly when either side is a quantified expression', t => {
  t.is(removeImplications('A.x f(x) -> E.y g(y)'), 'E.x !f(x) | E.y g(y)')
})

test('Implication removal works correctly within a quantified expression', t => {
  t.is(removeImplications('A.x (f(x) -> g(y))'), 'A.x (!f(x) | g(y))')
})

test('Implication removal does not permanently alter the formula object', t => {
  const s = 'A.x (f(x) -> g(x)) -> P(f(x), y) | (P -> Q)'
  const obj = parse(s)
  lib.removeImplications(obj)
  t.is(lib.stringify(obj), s)
})

test('Collect names from functions', t => {
  t.deepEqual(collectNames('f(x, g(y, z))'), {
    f: 'FunctionExpression',
    x: 'VariableOrConstant',
    g: 'FunctionExpression',
    y: 'VariableOrConstant',
    z: 'VariableOrConstant'
  })
})

test('Collect names from predicates', t => {
  t.deepEqual(collectNames('P(x, g(y, z))'), {
    x: 'VariableOrConstant',
    g: 'FunctionExpression',
    y: 'VariableOrConstant',
    z: 'VariableOrConstant'
  })
})

test('Collect names from binary expressions', t => {
  t.deepEqual(collectNames('f(x) | g(y)'), {
    f: 'FunctionExpression',
    x: 'VariableOrConstant',
    g: 'FunctionExpression',
    y: 'VariableOrConstant'
  })
})

test('Collect names from quantified expressions', t => {
  t.deepEqual(collectNames('A.x f(x)'), {
    x: 'VariableOrConstant',
    f: 'FunctionExpression'
  })
})

test('Collect names from expression statements', t => {
  t.deepEqual(collectNames('(P(x))'), {
    x: 'VariableOrConstant'
  })
})

test('Collect names from negated expressions', t => {
  t.deepEqual(collectNames('!f(x)'), {
    f: 'FunctionExpression',
    x: 'VariableOrConstant'
  })
})

test('Throw an error if a function with the same name as a variable is encountered', t => {
  t.throws(() => collectNames('f(x) | g(f)'), { message: 'Found conflict between variable and function name (f).' })
})

test('Mark free variables in quantified expressions', t => {
  const marked = markFree('A.x f(x, y, g(y))')
  t.is(marked.variable.free, false)
  t.is(marked.expression.arguments[0].free, false)
  t.is(marked.expression.arguments[1].free, true)
  t.is(marked.expression.arguments[2].arguments[0].free, true)
})

test('Mark free variables in nested quantified expressions', t => {
  const marked = markFree('A.x E.y (f(x) | !P(x, y, z))')
  const expr = marked.expression.expression.expression // f(x) | !P(x, y, z)
  t.is(expr.left.arguments[0].free, false)
  t.is(expr.right.argument.arguments[0].free, false)
  t.is(expr.right.argument.arguments[1].free, false)
  t.is(expr.right.argument.arguments[2].free, true)
})

test('Determine whether a variable appears free in a function', t => {
  t.is(containsFree('A.y f(x, y)', 'x'), true)
  t.is(containsFree('A.x f(x, y)', 'x'), false)
  t.is(containsFree('A.x f(y, z)', 'x'), false)
})

test('Determine whether a variable appears free in a binary expression', t => {
  t.is(containsFree('A.y P(x, y) | E.x Q(x, y)', 'y'), true)
  t.is(containsFree('A.y P(x, y) | E.x Q(x, y)', 'x'), true)
  t.is(containsFree('P(x) | A.x Q(x)', 'x'), true)
})

test('Determine whether a variable appears free in a negated expression', t => {
  t.is(containsFree('!A.y P(x, y)', 'x'), true)
})

test('Determine whether a variable appears free in an expression statement', t => {
  t.is(containsFree('!A.y (P(x, y) | f(x))', 'x'), true)
})

test('Quantifiers are moved left in binary expressions where appropriate', t => {
  t.is(moveQuantifiersLeft('P(y) | A.x Q(x)'), 'A.x (P(y) | Q(x))')
})

test('Quantifiers are not moved left when the quantified variable appears free at the left of a binary expression', t => {
  t.is(moveQuantifiersLeft('P(x) | A.x Q(x)'), 'P(x) | A.x Q(x)')
})

test('Move quantifiers left with multiple quantifiers', t => {
  t.is(
    moveQuantifiersLeft('A.z h(z) & E.w k(w)'),
    'A.z E.w (h(z) & k(w))'
  )
  t.is(
    moveQuantifiersLeft('E.x f(x) & A.y g(y) | A.z h(z)'),
    'E.x A.y A.z (f(x) & g(y) | h(z))'
  )
  t.is(
    moveQuantifiersLeft('E.x f(x) & A.y g(y) | A.z h(z) & E.w k(w)'),
    'E.x A.y A.z E.w (f(x) & g(y) | h(z) & k(w))'
  )
})

test('Move quantifiers left with quantifiers first', t => {
  t.is(
    moveQuantifiersLeft('A.x A.y (f(x, y) | E.z (f(x, z) & f(y, z)))'),
    'A.x A.y E.z (f(x, y) | f(x, z) & f(y, z))'
  )
})

test('Parens are maintained when appropriate while moving quantifiers left', t => {
  t.is(
    moveQuantifiersLeft('A.z (P(x) & (!Q(z) | E.y R(z, y) | A.w !P(w)))'),
    'A.z E.y A.w (P(x) & (!Q(z) | R(z, y) | !P(w)))'
  )
  t.is(
    moveQuantifiersLeft('A.z ((P(x) | R(x)) & (!Q(z) | E.y R(z, y) | A.w !P(w)))'),
    'A.z E.y A.w ((P(x) | R(x)) & (!Q(z) | R(z, y) | !P(w)))'
  )
})

test('Moving quantifiers left does not permanently alter the formula object', t => {
  const s = 'A.y P(f(y), z) | (E.x !!Q(x) & E.y !!!Q(y) -> A.x f(x))'
  const obj = parse(s)
  lib.moveQuantifiersLeft(obj)
  t.is(lib.stringify(obj), s)
})
