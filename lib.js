import _ from 'bilby'

const strings = {
  Conjunction: '&',
  Disjunction: '|',
  Implication: '->',
  Negation: '!',
  Universal: 'A.',
  Existential: 'E.'
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
    (t) => t.type === 'VariableOrConstant',
    (t) => t.name
  ).method('stringify',
    (t) => t.type === 'BinaryExpression',
    (t) => [
      lib.stringify(t.left),
      strings[t.operator],
      lib.stringify(t.right)
    ].join(' ')
  ).method('stringify',
    (t) => (t.type === 'UnaryExpression') && (t.operator === 'Negation'),
    (t) => strings[t.operator] + lib.stringify(t.argument)
  ).method('stringify',
    (t) => t.type === 'FunctionExpression',
    (t) => {
      const args = t.arguments.map(lib.stringify)
      return t.name + '(' + args.join(',') + ')'
    }
  ).method('stringify',
    (t) => t.type === 'Predicate',
    (t) => {
      if (t.arguments.length) {
        const args = t.arguments.map(lib.stringify)
        return t.name + '(' + args.join(',') + ')'
      } else return t.name
    }
  ).method('stringify',
    (t) => t.type === 'ExpressionStatement',
    (t) => '(' + lib.stringify(t.expression) + ')'
  ).method('stringify',
    (t) => t.type === 'QuantifiedExpression',
    (t) => strings[t.quantifier] + lib.stringify(t.variable) + ' ' + lib.stringify(t.expression)
  )

lib = lib
  .method('negate',
    (t) => ['VariableOrConstant', 'Predicate', 'FunctionExpression'].indexOf(t.type) >= 0,
    (t) => negationWrap(t)
  ).method('negate',
    (t) => (t.type === 'UnaryExpression') && (t.operator === 'Negation'),
    (t) => t.argument
  ).method('negate',
    (t) => t.type === 'ExpressionStatement',
    (t) => {
      return expressionWrap(lib.negate(t.expression))
    }
  ).method('negate',
    (t) => t.type === 'BinaryExpression',
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
    (t) => t.type === 'QuantifiedExpression',
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
    (t) => (t.argument.type === 'UnaryExpression') && (t.argument.operator === 'Negation'),
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
    (t) => t.argument.type === 'ExpressionStatement',
    (t) => lib.negate(t.argument)
  ).method('collapseNegation',
    (t) => t.argument.type === 'QuantifiedExpression',
    (t) => {
      t.argument = lib.collapseNegations(lib.negate(t.argument))
      t.argument.expression = lib.collapseNegations(t.argument.expression)
      return t.argument
    }
  ).method('collapseNegation',
    (t) => true,
    (t) => t
  )

lib = lib
  .method('collapseNegations',
    (t) => t.type === 'BinaryExpression',
    (t) => {
      t.left = lib.collapseNegations(t.left)
      t.right = lib.collapseNegations(t.right)
      return t
    }
  )
  .method('collapseNegations',
    (t) => (t.type === 'UnaryExpression') && (t.operator === 'Negation'),
    (t) => lib.collapseNegation(t)
  ).method('collapseNegations',
    (t) => (t.type === 'QuantifiedExpression'),
    (t) => {
      t.expression = lib.collapseNegations(t.expression)
      return t
    }
  ).method('collapseNegations',
    (t) => t.type === 'ExpressionStatement',
    (t) => expressionWrap(lib.collapseNegations(t.expression))
  ).method('collapseNegations',
    (t) => ['FunctionExpression', 'Predicate'].indexOf(t.type) >= 0,
    (t) => {
      t.arguments = t.arguments.map(lib.collapseNegations)
      return t
    }
  ).method('collapseNegations',
    (t) => true,
    (t) => t
  )

lib = lib
  .method('removeImplications',
    (t) => (t.type === 'BinaryExpression'),
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
    (t) => t.type === 'ExpressionStatement',
    (t) => expressionWrap(lib.removeImplications(t.expression))
  ).method('removeImplications',
    (t) => t.type === 'QuantifiedExpression',
    (t) => {
      t.expression = lib.removeImplications(t.expression)
      return t
    }
  ).method('removeImplications',
    (t) => true,
    (t) => t
  )

export default lib
