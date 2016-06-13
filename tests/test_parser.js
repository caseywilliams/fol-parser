import test from 'ava'
import makeParse from '../parser'

const parse = makeParse()

test('Empty input', t => {
  t.deepEqual(parse(''), {})
})

test('Single predicate', t => {
  t.deepEqual(parse('P'), {
    type: 'PREDICATE',
    value: 'P',
    arity: 0
  })
})

test('Predicate with arguments', t => {
  t.deepEqual(parse('P(x, y)'), {
    type: 'PREDICATE',
    value: 'P',
    arity: 2,
    first: [{
      type: 'VARIABLE',
      value: 'x',
      arity: 0
    }, {
      type: 'VARIABLE',
      value: 'y',
      arity: 0
    }]
  })
})

test('Single variable or constant', t => {
  t.deepEqual(parse('c'), {
    type: 'VARIABLE',
    value: 'c',
    arity: 0
  })
})

test('Default binary operation', t => {
  t.deepEqual(parse('P | Q'), {
    type: 'OR',
    arity: 2,
    first: {
      type: 'PREDICATE',
      value: 'P',
      arity: 0
    },
    second: {
      type: 'PREDICATE',
      value: 'Q',
      arity: 0
    }
  })
})

test('Parentheses', t => {
  t.deepEqual(parse('(P | Q)'), {
    type: 'OR',
    arity: 2,
    first: {
      type: 'PREDICATE',
      value: 'P',
      arity: 0
    },
    second: {
      type: 'PREDICATE',
      value: 'Q',
      arity: 0
    }
  })
})

test('Precedence of and/or is greater than impl', t => {
  t.deepEqual(parse('P -> Q & R'), {
    type: 'IMPL',
    arity: 2,
    first: {
      type: 'PREDICATE',
      value: 'P',
      arity: 0
    },
    second: {
      type: 'AND',
      arity: 2,
      first: {
        type: 'PREDICATE',
        value: 'Q',
        arity: 0
      },
      second: {
        type: 'PREDICATE',
        value: 'R',
        arity: 0
      }
    }
  })
})

test('Parentheses can override default operator precedence', t => {
  t.deepEqual(parse('(P -> Q) & R'), {
    type: 'AND',
    arity: 2,
    first: {
      type: 'IMPL',
      arity: 2,
      first: {
        type: 'PREDICATE',
        value: 'P',
        arity: 0
      },
      second: {
        type: 'PREDICATE',
        value: 'Q',
        arity: 0
      }
    },
    second: {
      type: 'PREDICATE',
      value: 'R',
      arity: 0
    }

  })
})

test('Error: function symbol with no arguments', t => {
  t.throws(() => parse('f()'), 'Functions should have at least one argument')
})

test('Error: function with inappropriate argument types', t => {
  t.throws(() => parse('f(x, P)'), 'Function parameters should be variables, constants, or other functions')
})

test('Function symbol with single argument', t => {
  t.deepEqual(parse('f(x)'), {
    type: 'FUNCTION',
    value: 'f',
    arity: 1,
    first: [{
      type: 'VARIABLE',
      value: 'x',
      arity: 0
    }]
  })
})

test('Function symbol with multiple arguments', t => {
  t.deepEqual(parse('f(x, y)'), {
    type: 'FUNCTION',
    value: 'f',
    arity: 2,
    first: [{
      type: 'VARIABLE',
      value: 'x',
      arity: 0
    }, {
      type: 'VARIABLE',
      value: 'y',
      arity: 0
    }]
  })
})

test('Function symbol with function arguments', t => {
  t.deepEqual(parse('f(g(x))'), {
    type: 'FUNCTION',
    value: 'f',
    arity: 1,
    first: [{
      type: 'FUNCTION',
      value: 'g',
      arity: 1,
      first: [{
        type: 'VARIABLE',
        value: 'x',
        arity: 0
      }]
    }]
  })
})

test('Quantifier without a variable', t => {
  t.throws(() => parse('E. f(x)'), 'Expected a variable for quantification (got FUNCTION)')
})

test('Quantified function', t => {
  t.deepEqual(parse('E.x f(x)'), {
    type: 'EXIS',
    arity: 2,
    first: {
      type: 'VARIABLE',
      value: 'x',
      arity: 0
    },
    second: {
      type: 'FUNCTION',
      value: 'f',
      arity: 1,
      first: [{
        type: 'VARIABLE',
        value: 'x',
        arity: 0
      }]
    }

  })
})

test('Quantified expression', t => {
  t.deepEqual(parse('A.x (f(x) -> P | Q)'), {
    type: 'UNIV',
    arity: 2,
    first: {
      type: 'VARIABLE',
      value: 'x',
      arity: 0
    },
    second: {
      type: 'IMPL',
      arity: 2,
      first: {
        type: 'FUNCTION',
        value: 'f',
        arity: 1,
        first: [{
          type: 'VARIABLE',
          value: 'x',
          arity: 0
        }]
      },
      second: {
        type: 'OR',
        arity: 2,
        first: {
          type: 'PREDICATE',
          value: 'P',
          arity: 0
        },
        second: {
          type: 'PREDICATE',
          value: 'Q',
          arity: 0
        }
      }
    }
  })
})

test('Quantifier scope isn\'t too greedy', t => {
  t.deepEqual(parse('E.x f(x) | g(x)'), {
    type: 'OR',
    arity: 2,
    first: {
      type: 'EXIS',
      arity: 2,
      first: {
        type: 'VARIABLE',
        value: 'x',
        arity: 0
      },
      second: {
        type: 'FUNCTION',
        value: 'f',
        arity: 1,
        first: [{
          type: 'VARIABLE',
          value: 'x',
          arity: 0
        }]
      }
    },
    second: {
      type: 'FUNCTION',
      value: 'g',
      arity: 1,
      first: [{
        type: 'VARIABLE',
        value: 'x',
        arity: 0
      }]
    }
  })
})
