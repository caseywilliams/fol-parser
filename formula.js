import parse from './parse'
import multimethod from 'multimethod'

const operatorStrings = {
  Conjunction: '&',
  Disjunction: '|',
  Implication: '->',
  Negation: '!'
}

const print = multimethod()
  .dispatch(function(t) {
    return t.type
  })
  .when('BinaryExpression', function (t) {
    return [
      print(t.left),
      operatorStrings[t.operator],
      print(t.right) ].join(' ')
  })
  .when('UnaryExpression', function (t) {
    if (t.operator === 'Negation')
      return operatorStrings[t.operator] + print(t.argument)
    else throw new Error(`Unknown operator: ${t.operator}`)
  })
  .when('ExpressionStatement', function (t) {
    return '(' + print(t.expression) + ')'
  })
  .when('Predicate', function (t) {
    if (t.arguments.length) {
      const args = t.arguments.map(print)
      return t.name + '(' + args.join(',') + ')'
    } else return t.name
  })
  .when('FunctionExpression', function (t) {
      const args = t.arguments.map(print)
      return t.name +  '(' + args.join(',') + ')'
  })
  .when('QuantifiedExpression', function (t) {
    let out = (t.quantifier === 'Universal' ? 'A.' : 'E.')
    return out + print(t.variable) + ' ' + print(t.expression)
  })
  .when('VariableOrConstant', function (t) {
    return t.name
  })

export default class Formula {
  constructor (input) {
    this.source = parse(input)
  }

  stringify () {
    return print(this.source)
  }

}
