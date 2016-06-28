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

lib = lib
  .method('makeReplacement',
    match.hasArguments,
    (t, from, to, scope = []) => {
      t.arguments = t.arguments.map((arg) => {
        if (arg.name === to) {
          /* unexpected variable or constant already used in scope */
          arg.name = String.fromCharCode(charCodeNotIn(scope))
          return lib.makeReplacement(arg, from, to, scope)
        } else {
          return lib.makeReplacement(arg, from, to, scope)
        }
      })
      return t
    }
  ).method('makeReplacement',
    match.isVariable,
    (t, from, to, scope = []) => {
      if (to && t.name === from) t.name = to
      return t
    }
  ).method('makeReplacement',
    match.hasExpression,
    (t, from, to, scope = []) => {
      t.expression = lib.makeReplacement(t.expression, from, to, scope)
      return t
    }
  ).method('makeReplacement',
    match.isBinary,
    (t, from, to, scope = []) => {
      t.left = lib.makeReplacement(t.left, from, to, scope)
      t.right = lib.makeReplacement(t.right, from, to, scope)
      return t
    }
  ).method('makeReplacement',
    match.default,
    (t, from, to, scope = []) => t
  )

function charCodeNotIn (scope) {
  let charCode
  if (scope.length >= 26) throw new Error('Formula too complex')
  do {
    charCode = Math.floor(Math.random() * 26) + 97
  } while (scope.indexOf(charCode) >= 0)
  return charCode
}

function merge (scope, item) {
  if (_.isArray(item)) {
    item.map((i) => merge(scope, i))
  } else if(scope.indexOf(item) < 0) {
    scope.push(item)
  }
  return scope
}

lib = lib
  .method('renameVariables',
    match.isQuantified,
    (t, scope = []) => {
      const quantified = t.variable.name.charCodeAt(0)
      if (scope.indexOf(quantified) >= 0) {
        const from = t.variable.name
        const charCode = charCodeNotIn(scope)
        const to = String.fromCharCode(charCode)
        t.variable.name = to
        t.expression = lib.makeReplacement(lib.renameVariables(t.expression, scope), from, to, scope)
        merge(scope, charCode)
      } else {
        merge(scope, quantified)
        t.expression = lib.renameVariables(t.expression, scope)
      }
      return t
    }
  ).method('renameVariables',
    match.isBinary,
    (t, scope = []) => {
      t.left = lib.renameVariables(t.left, scope)
      t.right = lib.renameVariables(t.right, scope)
      return t
    }
  ).method('renameVariables',
    match.isExpression,
    (t, scope = []) => {
      t.expression = lib.renameVariables(t.expression, scope)
      return t
    }
  ).method('renameVariables',
    match.hasArguments,
    (t, scope = []) => {
      if (match.isFunction(t)) {
        /* Prevent using a function symbol as a variable name */
        merge(scope, t.name.charCodeAt(0))
      }
      t.arguments = t.arguments.map((arg) => {
        merge(scope, arg.name.charCodeAt(0))
        return lib.renameVariables(arg, scope)
      })
      return t
    }
  ).method('renameVariables',
    match.default,
    (t, scope = []) => t
  )

lib = lib
  .method('collectNames',
    match.isVariable,
    (t, scope = []) => {
      return merge(scope, t.name.charCodeAt(0))
    }
  ).method('collectNames',
    match.hasArguments,
    (t, scope = []) => {
      if (match.isFunction(t)) {
        scope = merge(scope, t.name.charCodeAt(0))
      }
      let args = t.arguments.map((arg) => lib.collectNames(arg, scope))
      return scope
    }
  ).method('collectNames',
    match.isBinary,
    (t, scope = []) => {
      scope = merge(scope, lib.collectNames(t.left))
      scope = merge(scope, lib.collectNames(t.right))
      return scope
    }
  ).method('collectNames',
    match.isQuantified,
    (t, scope = []) => {
      scope = merge(scope, t.variable.name.charCodeAt(0))
      scope = merge(scope, lib.collectNames(t.expression))
      return scope
    }
  ).method('collectNames',
    match.isExpression,
    (t, scope = []) => merge(scope, lib.collectNames(t.expression))
  ).method('collectNames',
    match.isNegation,
    (t, scope = []) => merge(scope, lib.collectNames(t.argument))
  ).method('collectNames',
    match.default,
    (t, scope = []) => scope
  )
export default lib
