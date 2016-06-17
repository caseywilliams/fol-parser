import test from 'ava'
import parse from '../parse'

test('Empty input', t => {
  t.deepEqual(parse(''), {})
})

test('Single predicate', t => {
  t.deepEqual(parse('P'), {
    type: 'Predicate',
    name: 'P',
    start: 0,
    end: 1,
    arguments: []
  })
})

test('Predicate with arguments', t => {
  t.deepEqual(parse('P(x, y)'), {
    type: 'Predicate',
    name: 'P',
    start: 0,
    end: 7,
    arguments: [{
      type: 'VariableOrConstant',
      name: 'x',
      start: 2,
      end: 3
    }, {
      type: 'VariableOrConstant',
      name: 'y',
      start: 5,
      end: 6
    }]
  })
})

test('Single variable or constant', t => {
  t.deepEqual(parse('c'), {
    type: 'VariableOrConstant',
    name: 'c',
    start: 0,
    end: 1
  })
})

test('Boolean values', t => {
  t.deepEqual(parse('True'), {
    type: 'Literal',
    value: true,
    start: 0,
    end: 4
  })
  t.deepEqual(parse('False'), {
    type: 'Literal',
    value: true,
    start: 0,
    end: 5
  })
})

test('Default binary operation', t => {
  t.deepEqual(parse('P | Q'), {
    type: 'BinaryExpression',
    operator: 'Disjunction',
    start: 0,
    end: 5,
    left: {
      type: 'Predicate',
      name: 'P',
      start: 0,
      end: 1,
      arguments: []
    },
    right: {
      type: 'Predicate',
      name: 'Q',
      start: 4,
      end: 5,
      arguments: []
    }
  })
})

test('Negation', t => {
  t.deepEqual(parse('!P'), {
    type: 'UnaryExpression',
    operator: 'Negation',
    start: 0,
    end: 2,
    argument: {
      type: 'Predicate',
      name: 'P',
      start: 1,
      end: 2,
      arguments: []
    }
  })
})

test('Expression statement', t => {
  t.deepEqual(parse('(P | Q)'), {
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
        arguments: []
      },
      right: {
        type: 'Predicate',
        name: 'Q',
        start: 5,
        end: 6,
        arguments: []
      }
    }
  })
})

test('Precedence of and/or is greater than impl', t => {
  t.deepEqual(parse('P -> Q & R'), {
    type: 'BinaryExpression',
    operator: 'Implication',
    start: 0,
    end: 10,
    left: {
      type: 'Predicate',
      name: 'P',
      start: 0,
      end: 1,
      arguments: []
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
        arguments: []
      },
      right: {
        type: 'Predicate',
        name: 'R',
        start: 9,
        end: 10,
        arguments: []
      }
    }
  })
})

test('Parentheses override default operator precedence', t => {
  t.deepEqual(parse('(P -> Q) & R'), {
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
          arguments: []
        },
        right: {
          type: 'Predicate',
          name: 'Q',
          start: 6,
          end: 7,
          arguments: []
        }
      }
    },
    right: {
      type: 'Predicate',
      name: 'R',
      start: 11,
      end: 12,
      arguments: []
    }

  })
})

test('Error: function symbol with no arguments', t => {
  t.throws(() => parse('f()'), 'Functions should have at least one argument')
})

test('Error: inappropriate argument types', t => {
  t.throws(() => parse('f(x, P)'), 'Function arguments should be variables, constants, or other functions (got Predicate)')
  t.throws(() => parse('P(x, Q)'), 'Predicate arguments should be variables, constants, or functions (got Predicate)')
})

test('Function symbol with single argument', t => {
  t.deepEqual(parse('f(x)'), {
    type: 'FunctionExpression',
    name: 'f',
    start: 0,
    end: 4,
    arguments: [{
      type: 'VariableOrConstant',
      name: 'x',
      start: 2,
      end: 3
    }]
  })
})

test('Function symbol with multiple arguments', t => {
  t.deepEqual(parse('f(x, y)'), {
    type: 'FunctionExpression',
    name: 'f',
    start: 0,
    end: 7,
    arguments: [{
      type: 'VariableOrConstant',
      name: 'x',
      start: 2,
      end: 3
    }, {
      type: 'VariableOrConstant',
      name: 'y',
      start: 5,
      end: 6
    }]
  })
})

test('Function symbol with function arguments', t => {
  t.deepEqual(parse('f(g(x))'), {
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
        end: 5
      }]
    }]
  })
})

test('Quantifier without a variable', t => {
  t.throws(() => parse('E. f(x)'), 'Expected a variable for quantification (got FunctionExpression)')
})

test('Quantified function', t => {
  t.deepEqual(parse('E.x f(x)'), {
    type: 'QuantifiedExpression',
    quantifier: 'Existential',
    start: 0,
    end: 8,
    variable: {
      type: 'VariableOrConstant',
      name: 'x',
      start: 2,
      end: 3
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
        end: 7
      }]
    }

  })
})

test('Quantified expression', t => {
  t.deepEqual(parse('A.x (P -> Q)'), {
    type: 'QuantifiedExpression',
    quantifier: 'Universal',
    start: 0,
    end: 12,
    variable: {
      type: 'VariableOrConstant',
      name: 'x',
      start: 2,
      end: 3
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
          arguments: []
        },
        right: {
          type: 'Predicate',
          name: 'Q',
          start: 10,
          end: 11,
          arguments: []
        }
      }
    }
  })
})

test('Quantifier scope isn\'t too greedy', t => {
  t.deepEqual(parse('E.x f(x) | g(x)'), {
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
        end: 3
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
          end: 7
        }]
      }
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
        end: 14
      }]
    }
  })
})
