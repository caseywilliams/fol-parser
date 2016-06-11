import test from 'ava'
import makeParse from './parser'

const parse = makeParse()

test('Single predicate', t => {
  t.deepEqual(parse('P'), {
    type: 'PREDICATE',
    value: 'P',
    arity: 0
  })
})

test('OR operation', t => {
  t.deepEqual(parse('P | Q'), {
    type: 'OR',
    value: '|',
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
