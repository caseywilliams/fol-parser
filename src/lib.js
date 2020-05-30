const _ = require('bilby')
const c = require('clone')

const clone = function (obj) { return c(obj, false) }

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

function negationWrap (t) {
  return {
    type: 'UnaryExpression',
    operator: 'Negation',
    argument: clone(t)
  }
}

function unwrapExpression (t) {
  return (match.isExpression(t) ? t.expression : t)
}

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
    (t) => ({
      type: 'ExpressionStatement',
      expression: lib.negate(t.expression)
    })
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
          left: clone(t.left),
          right: lib.negate(t.right)
        }
      }
    }
  ).method('negate',
    match.isQuantified,
    (t) => {
      return {
        type: t.type,
        variable: t.variable,
        quantifier: (t.quantifier === 'Universal') ? 'Existential' : 'Universal',
        expression: lib.negate(t.expression)
      }
    }
  )

lib = lib
  .method('collapseNegation',
    /** nested negations **/
    (t) => match.isNegation(t.argument),
    (t) => {
      let negated = clone(t.argument)
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
      const out = clone(t)
      out.argument = lib.collapseNegations(lib.negate(out.argument))
      out.argument.expression = lib.collapseNegations(out.argument.expression)
      return out.argument
    }
  ).method('collapseNegation',
    match.default,
    (t) => clone(t)
  )

lib = lib
  .method('collapseNegations',
    match.isBinary,
    (t) => {
      const out = clone(t)
      out.left = lib.collapseNegations(out.left)
      out.right = lib.collapseNegations(out.right)
      return out
    }
  )
  .method('collapseNegations',
    match.isNegation,
    (t) => lib.collapseNegation(t)
  ).method('collapseNegations',
    match.isQuantified,
    (t) => {
      const out = clone(t)
      out.expression = lib.collapseNegations(out.expression)
      return out
    }
  ).method('collapseNegations',
    match.isExpression,
    (t) => {
      const out = clone(t)
      out.expression = lib.collapseNegations(out.expression)
      return out
    }
  ).method('collapseNegations',
    match.hasArguments,
    (t) => {
      const out = clone(t)
      out.arguments = out.arguments.map(lib.collapseNegations)
      return out
    }
  ).method('collapseNegations',
    match.default,
    (t) => clone(t)
  )

lib = lib
  .method('removeImplications',
    match.isBinary,
    (t) => {
      const out = clone(t)
      out.left = lib.removeImplications(out.left)
      out.right = lib.removeImplications(out.right)
      if (out.operator === 'Implication') {
        out.operator = 'Disjunction'
        out.left = lib.negate(out.left)
      }
      return out
    }
  ).method('removeImplications',
    match.hasExpression,
    (t) => {
      const out = clone(t)
      out.expression = lib.removeImplications(out.expression)
      return out
    }
  ).method('removeImplications',
    match.default,
    (t) => clone(t)
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
      for (const arg of t.arguments) {
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
      for (const arg of t.arguments) {
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
      const o = clone(t)
      const keepRightWrap = match.isExpression(o.right)
      const keepLeftWrap = match.isExpression(o.left)
      o.right = lib.moveQuantifiersLeft(o.right)
      o.left = lib.moveQuantifiersLeft(o.left)
      if (!hasLeftDestinedQuantifier(o)) return o
      let rightExpr = o.right
      let leftExpr = o.left
      const leftQuantifiers = []
      const rightQuantifiers = []
      while (match.isQuantified(leftExpr)) {
        leftQuantifiers.push([leftExpr.quantifier, leftExpr.variable.name])
        leftExpr = leftExpr.expression
      }
      while (match.isQuantified(rightExpr)) {
        rightQuantifiers.push([rightExpr.quantifier, rightExpr.variable.name])
        rightExpr = rightExpr.expression
      }
      const quantifiers = leftQuantifiers.concat(rightQuantifiers)
      let out = {
        type: 'BinaryExpression',
        operator: o.operator,
        left: (keepLeftWrap ? leftExpr : unwrapExpression(leftExpr)),
        right: (keepRightWrap ? rightExpr : unwrapExpression(rightExpr))
      }
      const [lastq, lastv] = quantifiers[quantifiers.length - 1]
      for (const [q, v] of quantifiers.reverse()) {
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
      const out = clone(t)
      out.expression = lib.moveQuantifiersLeft(out.expression)
      return out
    }
  ).method('moveQuantifiersLeft',
    match.isExpression,
    (t) => {
      let out = clone(t)
      out.expression = lib.moveQuantifiersLeft(out.expression)
      if (match.isQuantified(out.expression)) out = unwrapExpression(out)
      return out
    }
  ).method('moveQuantifiersLeft',
    match.default,
    (t) => clone(t)
  )

module.exports = lib
