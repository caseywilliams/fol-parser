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
    match.isFunction,
    (t) => {
      const args = t.arguments.map(lib.stringify)
      return t.name + '(' + args.join(',') + ')'
    }
  ).method('stringify',
    match.isPredicate,
    (t) => {
      if (t.arguments.length) {
        const args = t.arguments.map(lib.stringify)
        return t.name + '(' + args.join(',') + ')'
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
      if (t.expression.type === 'ExpressionStatement') {
        /* Maintain existing parens around quantified expressions */
        t.expression = negationWrap(t.expression)
      } else t.expression = lib.negate(t.expression)
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
      if (negated.argument.type === 'QuantifiedExpression') {
        negated.argument.expression = lib.collapseNegations(negated.argument.expression)
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
    (t, from, to) => {
      t.arguments = t.arguments.map((arg) => lib.makeReplacement(arg, from, to))
      return t
    }
  ).method('makeReplacement',
    match.isVariable,
    (t, from, to) => {
      if (to && t.name === from) t.name = to
      return t
    }
  ).method('makeReplacement',
    match.hasExpression,
    (t, from, to) => {
      t.expression = lib.makeReplacement(t.expression, from, to)
      return t
    }
  ).method('makeReplacement',
    match.isBinary,
    (t, from, to) => {
      t.left = lib.makeReplacement(t.left, from, to)
      t.right = lib.makeReplacement(t.right, from, to)
      return t
    }
  ).method('makeReplacement',
    match.default,
    (t, from, to) => t
  )

lib = lib
  .method('renameVariables',
    match.isQuantified,
    (t, scope = []) => {
      const quantified = t.variable.name.charCodeAt(0)
      if (scope.indexOf(quantified) >= 0) {
        let charCode
        while (true) {
          charCode = 65 + (Math.random() % 25)
          if (scope.indexOf(charCode) < 0) break
        }
        const from = t.variable.name
        const to = String.fromCharCode(charCode).toLowerCase()
        t.variable.name = to
        t.expression = lib.makeReplacement(lib.renameVariables(t.expression, scope), from, to)
        scope.push(charCode)
      } else {
        scope.push(quantified)
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
    match.isFunction,
    (t, scope = []) => {
      t.arguments = t.arguments.map(lib.renameVariables, scope)
      return t
    }
  ).method('renameVariables',
    match.default,
    (t, scope = []) => t
  )

export default lib
