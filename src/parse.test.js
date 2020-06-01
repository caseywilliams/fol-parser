const parse = require('./parse')

describe('parse', () => {
  test('Empty input', () => {
    expect(parse('')).toEqual({})
  })

  test('Single predicate', () => {
    expect(parse('P')).toEqual({
      type: 'Predicate',
      name: 'P',
      start: 0,
      end: 1,
      arguments: [],
    })
  })

  test('Predicate with arguments', () => {
    expect(parse('P(x, !y)')).toEqual({
      type: 'Predicate',
      name: 'P',
      start: 0,
      end: 8,
      arguments: [{
        type: 'VariableOrConstant',
        name: 'x',
        start: 2,
        end: 3,
      }, {
        type: 'UnaryExpression',
        operator: 'Negation',
        start: 5,
        end: 7,
        argument: {
          type: 'VariableOrConstant',
          name: 'y',
          start: 6,
          end: 7,
        },
      }],
    })
  })

  test('Single variable or constant', () => {
    expect(parse('c')).toEqual({
      type: 'VariableOrConstant',
      name: 'c',
      start: 0,
      end: 1,
    })
  })

  test('Boolean values', () => {
    expect(parse('True')).toEqual({
      type: 'Literal',
      value: true,
      start: 0,
      end: 4,
    })

    expect(parse('False')).toEqual({
      type: 'Literal',
      value: true,
      start: 0,
      end: 5,
    })
  })

  test('Default binary operation', () => {
    expect(parse('P | Q')).toEqual({
      type: 'BinaryExpression',
      operator: 'Disjunction',
      start: 0,
      end: 5,
      left: {
        type: 'Predicate',
        name: 'P',
        start: 0,
        end: 1,
        arguments: [],
      },
      right: {
        type: 'Predicate',
        name: 'Q',
        start: 4,
        end: 5,
        arguments: [],
      },
    })
  })

  test('Negation', () => {
    expect(parse('!P')).toEqual({
      type: 'UnaryExpression',
      operator: 'Negation',
      start: 0,
      end: 2,
      argument: {
        type: 'Predicate',
        name: 'P',
        start: 1,
        end: 2,
        arguments: [],
      },
    })
  })

  test('Expression statement', () => {
    expect(parse('(P | Q)')).toEqual({
      type: 'ExpressionStatement',
      start: 0,
      end: 7,
      expression: {
        type: 'BinaryExpression',
        operator: 'Disjunction',
        start: 1,
        end: 6,
        left: {
          type: 'Predicate',
          name: 'P',
          start: 1,
          end: 2,
          arguments: [],
        },
        right: {
          type: 'Predicate',
          name: 'Q',
          start: 5,
          end: 6,
          arguments: [],
        },
      },
    })
  })

  test('Precedence of and/or is greater than impl', () => {
    expect(parse('P -> Q & R')).toEqual({
      type: 'BinaryExpression',
      operator: 'Implication',
      start: 0,
      end: 10,
      left: {
        type: 'Predicate',
        name: 'P',
        start: 0,
        end: 1,
        arguments: [],
      },
      right: {
        type: 'BinaryExpression',
        operator: 'Conjunction',
        start: 5,
        end: 10,
        left: {
          type: 'Predicate',
          name: 'Q',
          start: 5,
          end: 6,
          arguments: [],
        },
        right: {
          type: 'Predicate',
          name: 'R',
          start: 9,
          end: 10,
          arguments: [],
        },
      },
    })
  })

  test('Parentheses override default operator precedence', () => {
    expect(parse('(P -> Q) & R')).toEqual({
      type: 'BinaryExpression',
      operator: 'Conjunction',
      start: 0,
      end: 12,
      left: {
        type: 'ExpressionStatement',
        start: 0,
        end: 8,
        expression: {
          type: 'BinaryExpression',
          operator: 'Implication',
          start: 1,
          end: 7,
          left: {
            type: 'Predicate',
            name: 'P',
            start: 1,
            end: 2,
            arguments: [],
          },
          right: {
            type: 'Predicate',
            name: 'Q',
            start: 6,
            end: 7,
            arguments: [],
          },
        },
      },
      right: {
        type: 'Predicate',
        name: 'R',
        start: 11,
        end: 12,
        arguments: [],
      },
    })
  })

  test('Error: function symbol with no arguments', () => {
    expect(() => parse('f()'))
      .toThrow(/Functions should have at least one argument/)
  })

  test('Error: inappropriate argument types', () => {
    expect(() => parse('f(x, P)'))
      .toThrow(/Function arguments should be variables, constants, or other functions \(got Predicate\)/)
    expect(() => parse('P(x, Q)'))
      .toThrow(/Predicate arguments should be variables, constants, or functions \(got Predicate\)/)
  })

  test('Function symbol with single argument', () => {
    expect(parse('f(x)')).toEqual({
      type: 'FunctionExpression',
      name: 'f',
      start: 0,
      end: 4,
      arguments: [{
        type: 'VariableOrConstant',
        name: 'x',
        start: 2,
        end: 3,
      }],
    })
  })

  test('Function symbol with multiple arguments', () => {
    expect(parse('f(x, !y)')).toEqual({
      type: 'FunctionExpression',
      name: 'f',
      start: 0,
      end: 8,
      arguments: [{
        type: 'VariableOrConstant',
        name: 'x',
        start: 2,
        end: 3,
      }, {
        type: 'UnaryExpression',
        operator: 'Negation',
        start: 5,
        end: 7,
        argument: {
          type: 'VariableOrConstant',
          name: 'y',
          start: 6,
          end: 7,
        },
      }],
    })
  })

  test('Function symbol with function arguments', () => {
    expect(parse('f(g(x))')).toEqual({
      type: 'FunctionExpression',
      name: 'f',
      start: 0,
      end: 7,
      arguments: [{
        type: 'FunctionExpression',
        name: 'g',
        start: 2,
        end: 6,
        arguments: [{
          type: 'VariableOrConstant',
          name: 'x',
          start: 4,
          end: 5,
        }],
      }],
    })
  })

  test('Quantifier without a variable', () => {
    expect(() => parse('E. f(x)'))
      .toThrow(/Expected a variable for quantification \(got FunctionExpression\)/)
  })

  test('Quantified function', () => {
    expect(parse('E.x f(x)')).toEqual({
      type: 'QuantifiedExpression',
      quantifier: 'Existential',
      start: 0,
      end: 8,
      variable: {
        type: 'VariableOrConstant',
        name: 'x',
        start: 2,
        end: 3,
      },
      expression: {
        type: 'FunctionExpression',
        name: 'f',
        start: 4,
        end: 8,
        arguments: [{
          type: 'VariableOrConstant',
          name: 'x',
          start: 6,
          end: 7,
        }],
      },
    })
  })

  test('Quantified expression', () => {
    expect(parse('A.x (P -> Q)')).toEqual({
      type: 'QuantifiedExpression',
      quantifier: 'Universal',
      start: 0,
      end: 12,
      variable: {
        type: 'VariableOrConstant',
        name: 'x',
        start: 2,
        end: 3,
      },
      expression: {
        type: 'ExpressionStatement',
        start: 4,
        end: 12,
        expression: {
          type: 'BinaryExpression',
          operator: 'Implication',
          start: 5,
          end: 11,
          left: {
            type: 'Predicate',
            name: 'P',
            start: 5,
            end: 6,
            arguments: [],
          },
          right: {
            type: 'Predicate',
            name: 'Q',
            start: 10,
            end: 11,
            arguments: [],
          },
        },
      },
    })
  })

  test('Quantifier scope isn\'t too greedy', () => {
    expect(parse('E.x f(x) | g(x)')).toEqual({
      type: 'BinaryExpression',
      operator: 'Disjunction',
      start: 0,
      end: 15,
      left: {
        type: 'QuantifiedExpression',
        quantifier: 'Existential',
        start: 0,
        end: 8,
        variable: {
          type: 'VariableOrConstant',
          name: 'x',
          start: 2,
          end: 3,
        },
        expression: {
          type: 'FunctionExpression',
          name: 'f',
          start: 4,
          end: 8,
          arguments: [{
            type: 'VariableOrConstant',
            name: 'x',
            start: 6,
            end: 7,
          }],
        },
      },
      right: {
        type: 'FunctionExpression',
        name: 'g',
        start: 11,
        end: 15,
        arguments: [{
          type: 'VariableOrConstant',
          name: 'x',
          start: 13,
          end: 14,
        }],
      },
    })
  })
})
