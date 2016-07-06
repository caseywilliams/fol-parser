import _ from 'bilby'

const strings = {
  Conjunction: '&',
  Disjunction: '|',
  Implication: '->',
  Negation: '!',
  Universal: 'A.',
  Existential: 'E.'
}

const match = {
  default: (t) => true,
  isVariable: (t) => t.type === 'VariableOrConstant',
  isPredicate: (t) => t.type === 'Predicate',
  isBinary: (t) => t.type === 'BinaryExpression',
  isFunction: (t) => t.type === 'FunctionExpression',
  isExpression: (t) => t.type === 'ExpressionStatement',
  isQuantified: (t) => t.type === 'QuantifiedExpression',
  isNegation: (t) => (t.type === 'UnaryExpression') && (t.operator === 'Negation'),
  hasExpression: (t) => (t.type === 'ExpressionStatement') || (t.type === 'QuantifiedExpression'),
  hasArguments: (t) => (t.type === 'Predicate') || (t.type === 'FunctionExpression')
}

const negationWrap = (t) => ({
  type: 'UnaryExpression',
  operator: 'Negation',
  argument: t
})

const expressionWrap = (t) => ({
  type: 'ExpressionStatement',
  expression: t
})

let lib = _.environment()
  .method('stringify',
    match.isVariable,
    (t) => t.name
  ).method('stringify',
    match.isBinary,
    (t) => [
      lib.stringify(t.left),
      strings[t.operator],
      lib.stringify(t.right)
    ].join(' ')
  ).method('stringify',
    match.isNegation,
    (t) => strings[t.operator] + lib.stringify(t.argument)
  ).method('stringify',
    match.hasArguments,
    (t) => {
      if (t.arguments.length) {
        const args = t.arguments.map(lib.stringify)
        return t.name + '(' + args.join(', ') + ')'
      } else return t.name
    }
  ).method('stringify',
    match.isExpression,
    (t) => '(' + lib.stringify(t.expression) + ')'
  ).method('stringify',
    match.isQuantified,
    (t) => strings[t.quantifier] + lib.stringify(t.variable) + ' ' + lib.stringify(t.expression)
  )

lib = lib
  .method('negate',
    (t) => ['VariableOrConstant', 'Predicate', 'FunctionExpression'].indexOf(t.type) >= 0,
    (t) => negationWrap(t)
  ).method('negate',
    match.isNegation,
    (t) => t.argument
  ).method('negate',
    match.isExpression,
    (t) => {
      return expressionWrap(lib.negate(t.expression))
    }
  ).method('negate',
    match.isBinary,
    (t) => {
      if (t.operator === 'Conjunction') {
        return {
          type: 'BinaryExpression',
          operator: 'Disjunction',
          left: lib.negate(t.left),
          right: lib.negate(t.right)
        }
      } else if (t.operator === 'Disjunction') {
        return {
          type: 'BinaryExpression',
          operator: 'Conjunction',
          left: lib.negate(t.left),
          right: lib.negate(t.right)
        }
      } else if (t.operator === 'Implication') {
        return {
          type: 'BinaryExpression',
          operator: 'Conjunction',
          left: t.left,
          right: lib.negate(t.right)
        }
      }
    }
  ).method('negate',
    match.isQuantified,
    (t) => {
      t.quantifier = (t.quantifier === 'Universal') ? 'Existential' : 'Universal'
      t.expression = lib.negate(t.expression)
      return t
    }
  )

lib = lib
  .method('collapseNegation',
    /** nested negations **/
    (t) => match.isNegation(t.argument),
    (t) => {
      let negated = t.argument
      let n = 1
      if (match.isQuantified(negated.argument)) {
        negated.argument.expression = lib.collapseNegations(negated.argument.expression)
      } else if (match.hasArguments(negated.argument)) {
        negated.argument.arguments = negated.argument.arguments.map(lib.collapseNegations)
      }
      while ((negated.argument.type === 'UnaryExpression') &&
      (negated.argument.operator === 'Negation')) {
        negated = negated.argument
        ++n
      }
      return (n % 2) ? negated.argument : lib.negate(negated.argument)
    }
  ).method('collapseNegation',
    (t) => match.isExpression(t.argument),
    (t) => lib.negate(t.argument)
  ).method('collapseNegation',
    (t) => match.isQuantified(t.argument),
    (t) => {
      t.argument = lib.collapseNegations(lib.negate(t.argument))
      t.argument.expression = lib.collapseNegations(t.argument.expression)
      return t.argument
    }
  ).method('collapseNegation',
    match.default,
    (t) => t
  )

lib = lib
  .method('collapseNegations',
    match.isBinary,
    (t) => {
      t.left = lib.collapseNegations(t.left)
      t.right = lib.collapseNegations(t.right)
      return t
    }
  )
  .method('collapseNegations',
    match.isNegation,
    (t) => lib.collapseNegation(t)
  ).method('collapseNegations',
    (t) => (t.type === 'QuantifiedExpression'),
    (t) => {
      t.expression = lib.collapseNegations(t.expression)
      return t
    }
  ).method('collapseNegations',
    match.isExpression,
    (t) => expressionWrap(lib.collapseNegations(t.expression))
  ).method('collapseNegations',
    match.hasArguments,
    (t) => {
      t.arguments = t.arguments.map(lib.collapseNegations)
      return t
    }
  ).method('collapseNegations',
    match.default,
    (t) => t
  )

lib = lib
  .method('removeImplications',
    match.isBinary,
    (t) => {
      t.left = lib.removeImplications(t.left)
      t.right = lib.removeImplications(t.right)
      if (t.operator === 'Implication') {
        t.operator = 'Disjunction'
        t.left = lib.negate(t.left)
      }
      return t
    }
  ).method('removeImplications',
    match.isExpression,
    (t) => expressionWrap(lib.removeImplications(t.expression))
  ).method('removeImplications',
    (t) => t.type === 'QuantifiedExpression',
    (t) => {
      t.expression = lib.removeImplications(t.expression)
      return t
    }
  ).method('removeImplications',
    match.default,
    (t) => t
  )

const allChars = Array.from(new Array(26), (x, i) => i + 97)

function charCodeNotIn (scope) {
  let index = 0
  let c
  if (scope.length) {
    if (scope.length > 25) throw new Error('Formula too complex')
    let last = Math.max.apply(null, scope)
    if (allChars.indexOf(last) >= 0) {
      index = allChars.indexOf(last)
    }
  }
  while (true) {
    c = allChars[index]
    if (scope.indexOf(c) < 0) return c
    else index = ++index % 26
  }
}

function addName (t, scope = {}) {
  if (scope[t.name]) {
    if (scope[t.name] !== t.type) {
      throw new Error(`Found conflict between variable and function name (${t.name}).`)
    }
  } else {
    scope[t.name] = t.type
  }
  return scope
}

lib = lib
  .method('collectNames',
    match.isVariable,
    (t, scope = {}) => {
      return addName(t, scope)
    }
  ).method('collectNames',
    match.hasArguments,
    (t, scope = {}) => {
      if (match.isFunction(t)) {
        scope = addName(t, scope)
      }
      for (let arg of t.arguments) {
        scope = Object.assign(scope, lib.collectNames(arg, scope))
      }
      return scope
    }
  ).method('collectNames',
    match.isBinary,
    (t, scope = {}) => {
      scope = Object.assign(scope, lib.collectNames(t.left, scope))
      scope = Object.assign(scope, lib.collectNames(t.right, scope))
      return scope
    }
  ).method('collectNames',
    match.isQuantified,
    (t, scope = {}) => {
      scope = addName(t.variable, scope)
      scope = Object.assign(scope, lib.collectNames(t.expression, scope))
      return scope
    }
  ).method('collectNames',
    match.isExpression,
    (t, scope = {}) => Object.assign(scope, lib.collectNames(t.expression, scope))
  ).method('collectNames',
    match.isNegation,
    (t, scope = {}) => Object.assign(scope, lib.collectNames(t.argument, scope))
  ).method('collectNames',
    match.default,
    (t, scope = {}) => scope
  )

export default lib
