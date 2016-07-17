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
      t.expression = lib.negate(t.expression)
      return t
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
    (t) => {
      t.expression = lib.collapseNegations(t.expression)
      return t
    }
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
    (t) => {
      t.expression = lib.removeImplications(t.expression)
      return t
    }
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
    (t, names = {}) => {
      return addName(t, names)
    }
  ).method('collectNames',
    match.hasArguments,
    (t, names = {}) => {
      if (match.isFunction(t)) {
        names = addName(t, names)
      }
      for (let arg of t.arguments) {
        names = Object.assign(names, lib.collectNames(arg, names))
      }
      return names
    }
  ).method('collectNames',
    match.isBinary,
    (t, names = {}) => {
      names = Object.assign(names, lib.collectNames(t.left, names))
      names = Object.assign(names, lib.collectNames(t.right, names))
      return names
    }
  ).method('collectNames',
    match.isQuantified,
    (t, names = {}) => {
      names = addName(t.variable, names)
      names = Object.assign(names, lib.collectNames(t.expression, names))
      return names
    }
  ).method('collectNames',
    match.isExpression,
    (t, names = {}) => Object.assign(names, lib.collectNames(t.expression, names))
  ).method('collectNames',
    match.isNegation,
    (t, names = {}) => Object.assign(names, lib.collectNames(t.argument, names))
  ).method('collectNames',
    match.default,
    (t, names = {}) => names
  )

lib = lib
  .method('markFree',
    match.isVariable,
    (t, names, quantified = []) => {
      t.free = !quantified.includes(t.name)
      return t
    }
  ).method('markFree',
    match.hasArguments,
    (t, names, quantified = []) => {
      t.arguments = t.arguments.map(a => lib.markFree(a, names, quantified))
      return t
    }
  ).method('markFree',
    match.isBinary,
    (t, names, quantified = []) => {
      t.left = lib.markFree(t.left, names, quantified)
      t.right = lib.markFree(t.right, names, quantified)
      return t
    }
  ).method('markFree',
    match.isExpression,
    (t, names, quantified = []) => {
      t.expression = lib.markFree(t.expression, names, quantified)
      return t
    }
  ).method('markFree',
    match.isQuantified,
    (t, names, quantified = []) => {
      quantified.push(t.variable.name)
      t.expression = lib.markFree(t.expression, names, quantified)
      t.variable.free = false
      return t
    }
  ).method('markFree',
    match.isNegation,
    (t, names, quantified = []) => {
      t.argument = lib.markFree(t.argument, names, quantified)
      return t
    }
  ).method('markFree',
    match.default,
    (t, names, quantified = []) => t
  )

lib = lib
  .method('rename',
    match.isVariable,
    (t, scope) => {
      scope.push(t.name)
      t.name = scope.check(t.name)
      return t
    }
  ).method('rename',
    match.hasArguments,
    (t, scope) => {
      t.arguments = t.arguments.map((a) => lib.rename(a, scope))
      return t
    }
  ).method('rename',
    match.isQuantified,
    (t, scope) => {
      scope.push(t.variable.name, true)
      t.variable.name = scope.check(t.variable.name)
      scope.quantified.push(t.variable.name)
      t.expression = lib.rename(t.expression, scope)
      scope.quantified.pop()
      return t
    }
  ).method('rename',
    match.isBinary,
    (t, scope) => {
      t.left = lib.rename(t.left, scope)
      t.right = lib.rename(t.right, scope)
      return t
    }
  ).method('rename',
    match.isExpression,
    (t, scope) => {
      t.expression = lib.rename(t.expression, scope)
      return t
    }
  ).method('rename',
    match.isNegation,
    (t, scope) => {
      t.argument = lib.rename(t.argument, scope)
      return t
    }
  ).method('rename',
    match.default,
    (t, scope) => t
  )

lib = lib
  .method('containsFree',
    match.isVariable,
    (t, varName, quantified = []) => {
      if (t.name !== varName) return false
      return (quantified.indexOf(t.name) < 0)
    }
  ).method('containsFree',
    match.hasArguments,
    (t, varName, quantified = []) => {
      for (let arg of t.arguments) {
        if (lib.containsFree(arg, varName, quantified)) return true
      }
      return false
    }
  ).method('containsFree',
    match.isNegation,
    (t, varName, quantified = []) =>
      lib.containsFree(t.argument, varName, quantified)
  ).method('containsFree',
    match.isExpression,
    (t, varName, quantified = []) =>
      lib.containsFree(t.expression, varName, quantified)
  ).method('containsFree',
    match.isBinary,
    (t, varName, quantified = []) => (
      lib.containsFree(t.left, varName, quantified) ||
        lib.containsFree(t.right, varName, quantified)
    )
  ).method('containsFree',
    match.isQuantified,
    (t, varName, quantified = []) => {
      quantified.push(t.variable.name)
      const result = lib.containsFree(t.expression, varName, quantified)
      quantified.pop()
      return result
    }
  ).method('containsFree',
    match.default,
    (t, varName, quantified = []) => false
  )

/**
 * Test whether to apply equivalencies in moveQuantifiersLeft
 */
function hasLeftDestinedQuantifier (t) {
  if (!match.isBinary(t)) return false
  if (t.operator === 'Implication') return false
  if (t.right.type !== 'QuantifiedExpression') return false
  return !lib.containsFree(t.left, t.right.variable.name)
}

function expressionUnwrap (t) {
  return (match.isExpression(t) ? t.expression : t)
}

/**
 * Move quantifiers left using equivalencies
 * (Provided x is not free in P):
 * - P | A.x Q(x) == A.x (P | Q(x))
 * - P | E.x Q(x) == E.x (P | Q(x))
 * - P & A.x Q(x) == A.x (P & Q(x))
 * - P & E.x Q(x) == E.x (P & Q(x))
 * For prenex forms
 */
lib = lib
  .method('moveQuantifiersLeft',
    match.isBinary,
    (t) => {
      let keepRightWrap = match.isExpression(t.right)
      let keepLeftWrap = match.isExpression(t.left)
      t.right = lib.moveQuantifiersLeft(t.right)
      t.left = lib.moveQuantifiersLeft(t.left)
      if (!hasLeftDestinedQuantifier(t)) return t
      let rightExpr = t.right
      let leftExpr = t.left
      let leftQuantifiers = []
      let rightQuantifiers = []
      while (match.isQuantified(leftExpr)) {
        leftQuantifiers.push([leftExpr.quantifier, leftExpr.variable.name])
        leftExpr = leftExpr.expression
      }
      while (match.isQuantified(rightExpr)) {
        rightQuantifiers.push([rightExpr.quantifier, rightExpr.variable.name])
        rightExpr = rightExpr.expression
      }
      let quantifiers = leftQuantifiers.concat(rightQuantifiers)
      let out = {
        type: 'BinaryExpression',
        operator: t.operator,
        left: (keepLeftWrap ? leftExpr : expressionUnwrap(leftExpr)),
        right: (keepRightWrap ? rightExpr : expressionUnwrap(rightExpr))
      }
      let [lastq, lastv] = quantifiers[quantifiers.length - 1]
      for (let [q, v] of quantifiers.reverse()) {
        out = {
          type: 'QuantifiedExpression',
          quantifier: q,
          variable: {
            type: 'VariableOrConstant',
            name: v
          },
          expression: out
        }
        if ((q === lastq) && (v === lastv)) {
          out.expression = {
            type: 'ExpressionStatement',
            expression: out.expression
          }
        }
      }
      return out
    }
  ).method('moveQuantifiersLeft',
    match.isQuantified,
    (t) => {
      t.expression = lib.moveQuantifiersLeft(t.expression)
      return t
    }
  ).method('moveQuantifiersLeft',
    match.isExpression,
    (t) => {
      t.expression = lib.moveQuantifiersLeft(t.expression)
      if (match.isQuantified(t.expression)) t = expressionUnwrap(t)
      return t
    }
  ).method('moveQuantifiersLeft',
    match.default,
    (t) => t
  )

export default lib
