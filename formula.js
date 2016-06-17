import parse from './parse'
import multimethod from 'multimethod'

const operatorStrings = {
  Conjunction: '&',
  Disjunction: '|',
  Implication: '->',
  Negation: '!'
}

const print = multimethod()
  .dispatch(function (t) {
    return t.type
  })
  .when('VariableOrConstant', function (t) {
    return t.name
  })
  .when('BinaryExpression', function (t) {
    return [
      print(t.left),
      operatorStrings[t.operator],
      print(t.right) ].join(' ')
  })
  .when('UnaryExpression', function (t) {
    if (t.operator === 'Negation') {
      return operatorStrings[t.operator] + print(t.argument)
    } else throw new Error(`Unknown operator: ${t.operator}`)
  })
  .when('FunctionExpression', function (t) {
    const args = t.arguments.map(print)
    return t.name + '(' + args.join(',') + ')'
  })
  .when('Predicate', function (t) {
    if (t.arguments.length) {
      const args = t.arguments.map(print)
      return t.name + '(' + args.join(',') + ')'
    } else return t.name
  })
  .when('ExpressionStatement', function (t) {
    return '(' + print(t.expression) + ')'
  })
  .when('QuantifiedExpression', function (t) {
    let out = (t.quantifier === 'Universal' ? 'A.' : 'E.')
    return out + print(t.variable) + ' ' + print(t.expression)
  })
  .default(function (t) {
    throw new Error(`Unrecognized type: ${t.type}`)
  })

const negationWrap = (t) => ({
  type: 'UnaryExpression',
  operator: 'Negation',
  argument: t
})

const negate = multimethod()
  .dispatch(function (t) {
    if (!t || !t.type) throw new Error(`Invalid expression: ${JSON.stringify(t)}`)
    return t.type
  })
  .when('VariableOrConstant', function (t) {
    return negationWrap(t)
  })
  .when('UnaryExpression', function (t) {
    if (t.operator === 'Negation') {
      return t.argument
    } else throw new Error(`Unknown operator: ${t.operator}`)
  })
  .when('FunctionExpression', function (t) {
    return negationWrap(t)
  })
  .when('Predicate', function (t) {
    return negationWrap(t)
  })
  .when('ExpressionStatement', function (t) {
    const out = JSON.parse(JSON.stringify(t))
    if (t.expression.type === 'BinaryExpression') {
      if (t.expression.operator === 'Conjunction') {
        out.expression = {
          type: 'BinaryExpression',
          operator: 'Disjunction',
          left: negate(t.expression.left),
          right: negate(t.expression.right)
        }
      } else if (t.expression.operator === 'Disjunction') {
        out.expression = {
          type: 'BinaryExpression',
          operator: 'Conjunction',
          left: negate(t.expression.left),
          right: negate(t.expression.right)
        }
      } else if (t.expression.operator === 'Implication') {
        out.expression = {
          type: 'BinaryExpression',
          operator: 'Conjunction',
          right: negate(t.expression.right),
          left: t.expression.left
        }
      }
    }
    return out
  })
  .when('BinaryExpression', function (t) {
    return {
      type: 'BinaryExpression',
      operator: t.operator,
      left: negate(t.left),
      right: negate(t.right)
    }
  })
  .when('QuantifiedExpression', function (t) {
    const out = JSON.parse(JSON.stringify(t))
    if (t.quantifier === 'Universal') {
      out.quantifier = 'Existential'
    } else out.quantifier = 'Universal'
    out.expression = negate(t.expression)
    return out
  })
  .default(function (t) {
    throw new Error(`Unrecognized type: ${t.type}`)
  })

export default class Formula {
  constructor (input) {
    if (typeof input === 'string') {
      this.source = parse(input)
    } else if (typeof input === 'object') {
      this.source = JSON.parse(JSON.stringify(input))
    } else throw new Error(`Invalid formula input format: ${JSON.stringify(input)}`)
  }

  stringify () {
    return print(this.source)
  }

  negate () {
    return new Formula(negate(this.source))
  }
}
