const clone = obj => JSON.parse(JSON.stringify(obj))

const strings = {
  Conjunction: '&',
  Disjunction: '|',
  Implication: '->',
  Negation: '!',
  Universal: 'A.',
  Existential: 'E.',
}

const makeMultimethod = (implementations, defaultImplementation = null) => {
  return new Proxy((...args) => {
    throw new Error(`No match: ${args}`)
  }, {
    apply (target, thisArg, args) {
      return (implementations[args[0].type] || defaultImplementation || target)
        .apply(thisArg, args)
    },
  })
}

function unwrapExpression (t) {
  return (t.type === 'ExpressionStatement' ? t.expression : t)
}

const stringifyPredicateOrFunctionExpression = t => {
  if (t.arguments.length) {
    const args = t.arguments.map(stringify)
    return `${t.name}(${args.join(', ')})`
  }
  return t.name
}

const stringify = makeMultimethod({
  BinaryExpression: t =>
    [stringify(t.left), strings[t.operator], stringify(t.right)].join(' '),
  ExpressionStatement: t => `(${stringify(t.expression)})`,
  FunctionExpression: stringifyPredicateOrFunctionExpression,
  Predicate: stringifyPredicateOrFunctionExpression,
  QuantifiedExpression: t =>
    `${strings[t.quantifier]}${stringify(t.variable)} ${stringify(t.expression)}`,
  UnaryExpression: t => `${strings[t.operator]}${stringify(t.argument)}`,
  VariableOrConstant: t => t.name,
})

const negate = makeMultimethod({
  BinaryExpression: t => {
    if (t.operator === 'Conjunction') {
      return {
        type: 'BinaryExpression',
        operator: 'Disjunction',
        left: negate(t.left),
        right: negate(t.right),
      }
    }
    if (t.operator === 'Disjunction') {
      return {
        type: 'BinaryExpression',
        operator: 'Conjunction',
        left: negate(t.left),
        right: negate(t.right),
      }
    }
    if (t.operator === 'Implication') {
      return {
        type: 'BinaryExpression',
        operator: 'Conjunction',
        left: clone(t.left),
        right: negate(t.right),
      }
    }
  },
  ExpressionStatement: t => ({
    type: 'ExpressionStatement',
    expression: negate(t.expression),
  }),
  QuantifiedExpression: t => ({
    type: t.type,
    variable: t.variable,
    quantifier: (t.quantifier === 'Universal') ? 'Existential' : 'Universal',
    expression: negate(t.expression),
  }),
  UnaryExpression: t => t.argument,
}, t => ({
  type: 'UnaryExpression',
  operator: 'Negation',
  argument: clone(t),
}))

const collapseNegations = makeMultimethod({
  BinaryExpression: t => {
    const out = clone(t)
    out.left = collapseNegations(out.left)
    out.right = collapseNegations(out.right)
    return out
  },
  ExpressionStatement: t => {
    const out = clone(t)
    out.expression = collapseNegations(out.expression)
    return out
  },
  QuantifiedExpression: t => {
    const out = clone(t)
    out.expression = collapseNegations(out.expression)
    return out
  },
  UnaryExpression: t => collapseNegation(t),
}, t => {
  if (t.arguments) {
    const out = clone(t)
    out.arguments = out.arguments.map(collapseNegations)
    return out
  } else return clone(t)
})

const collapseNegation = makeMultimethod({
  ExpressionStatement: t => negate(t.argument),
  QuantifiedExpression: t => {
    const out = clone(t)
    out.argument = collapseNegations(negate(out.argument))
    out.argument.expression = collapseNegations(out.argument.expression)
    return out.argument
  },
  UnaryExpression: t => {
    if (t.argument.type === 'UnaryExpression') {
      let negated = clone(t.argument)
      let n = 1
      if (negated.argument.type === 'QuantifiedExpression') {
        negated.argument.expression = collapseNegations(negated.argument.expression)
      } else if (negated.argument.type === 'Predicate' || negated.argument.type === 'FunctionExpression') {
        negated.argument.arguments = negated.argument.arguments.map(collapseNegations)
      }
      while ((negated.argument.type === 'UnaryExpression') &&
      (negated.argument.operator === 'Negation')) {
        negated = negated.argument
        ++n
      }
      return (n % 2) ? negated.argument : negate(negated.argument)
    } else if (t.argument.type === 'QuantifiedExpression') {
      const out = clone(t)
      out.argument = collapseNegations(negate(out.argument))
      out.argument.expression = collapseNegations(out.argument.expression)
      return out.argument
    } else if (t.argument.type === 'ExpressionStatement') {
      return {
        type: 'ExpressionStatement',
        expression: negate(t.argument.expression),
      }
    } else {
      return clone(t)
    }
  },
}, clone)

const removeExpressionImplications = t => {
  const out = clone(t)
  out.expression = removeImplications(out.expression)
  return out
}

const removeImplications = makeMultimethod({
  BinaryExpression: t => {
    const out = clone(t)
    out.left = removeImplications(out.left)
    out.right = removeImplications(out.right)
    if (out.operator === 'Implication') {
      out.operator = 'Disjunction'
      out.left = negate(out.left)
    }
    return out
  },
  ExpressionStatement: removeExpressionImplications,
  QuantifiedExpression: removeExpressionImplications,
}, clone)

const _collectName = (t, scope = {}) => {
  if (scope[t.name]) {
    if (scope[t.name] !== t.type) {
      throw new Error(`'${t.name}' cannot refer to both a function and a variable or constant.`)
    }
  } else {
    scope[t.name] = t.type
  }

  return scope
}

const _collectArgumentNames = (t, scope = {}) => {
  t.arguments.forEach(arg => {
    Object.assign(scope, collectNames(arg, scope))
  })

  return scope
}

const collectNames = makeMultimethod({
  BinaryExpression: (t, scope = {}) => {
    return collectNames(t.right, collectNames(t.left, scope))
  },
  ExpressionStatement: (t, scope = {}) => {
    return collectNames(t.expression, scope)
  },
  FunctionExpression: (t, scope = {}) => {
    return _collectArgumentNames(t, _collectName(t, scope))
  },
  Predicate: (t, scope = {}) => {
    return _collectArgumentNames(t, scope)
  },
  QuantifiedExpression: (t, scope = {}) => {
    return collectNames(t.expression, _collectName(t.variable, scope))
  },
  UnaryExpression: (t, scope = {}) => {
    return collectNames(t.argument, scope)
  },
  VariableOrConstant: (t, scope = {}) => {
    return _collectName(t, scope)
  },
}, (t, names = {}) => names)

const markFree = makeMultimethod({
  BinaryExpression: (t, scope = {}, quantified = []) => {
    t.left = markFree(t.left, scope, quantified)
    t.right = markFree(t.right, scope, quantified)
    return t
  },
  ExpressionStatement: (t, scope = {}, quantified = []) => {
    t.expression = markFree(t.expression, scope, quantified)
    return t
  },
  FunctionExpression: (t, scope = {}, quantified = []) => {
    t.arguments = t.arguments.map(arg => markFree(arg, scope, quantified))
    return t
  },
  Predicate: (t, scope = {}, quantified = []) => {
    t.arguments = t.arguments.map(arg => markFree(arg, scope, quantified))
    return t
  },
  QuantifiedExpression: (t, scope = {}, quantified = []) => {
    quantified.push(t.variable.name)
    t.expression = markFree(t.expression, scope, quantified)
    t.variable.free = false
    return t
  },
  UnaryExpression: (t, scope = {}, quantified = []) => {
    t.argument = markFree(t.argument, scope, quantified)
    return t
  },
  VariableOrConstant: (t, _scope, quantified = []) => {
    t.free = !quantified.includes(t.name)
    return t
  },
}, clone)

const containsFree = makeMultimethod({
  BinaryExpression: (t, name, quantified = []) => {
    return containsFree(t.left, name, quantified) ||
      containsFree(t.right, name, quantified)
  },
  ExpressionStatement: (t, name, quantified = []) => {
    return containsFree(t.expression, name, quantified)
  },
  FunctionExpression: (t, name, quantified = []) => {
    for (const arg of t.arguments) {
      if (containsFree(arg, name, quantified)) return true
    }
    return false
  },
  Predicate: (t, name, quantified = []) => {
    for (const arg of t.arguments) {
      if (containsFree(arg, name, quantified)) return true
    }
    return false
  },
  QuantifiedExpression: (t, name, quantified = []) => {
    quantified.push(t.variable.name)
    const result = containsFree(t.expression, name, quantified)
    quantified.pop()
    return result
  },
  UnaryExpression: (t, name, quantified = []) => {
    return containsFree(t.argument, name, quantified)
  },
  VariableOrConstant: (t, name, quantified = []) => {
    if (t.name !== name) return false
    return (quantified.indexOf(t.name) < 0)
  },
}, () => false)

// Test whether to apply equivalencies in moveQuantifiersLeft
const _hasLeftDestinedQuantifier = (t) => {
  if (t.type !== 'BinaryExpression') return false
  if (t.operator === 'Implication') return false
  if (t.right.type !== 'QuantifiedExpression') return false
  return !containsFree(t.left, t.right.variable.name)
}

// Move quantifiers left using equivalencies
// (Provided x is not free in P):
// - P | A.x Q(x) == A.x (P | Q(x))
// - P | E.x Q(x) == E.x (P | Q(x))
// - P & A.x Q(x) == A.x (P & Q(x))
// - P & E.x Q(x) == E.x (P & Q(x))
// For prenex forms
const moveQuantifiersLeft = makeMultimethod({
  BinaryExpression: t => {
    const o = clone(t)
    const keepRightWrap = o.right.type === 'ExpressionStatement'
    const keepLeftWrap = o.left.type === 'ExpressionStatement'
    o.right = moveQuantifiersLeft(o.right)
    o.left = moveQuantifiersLeft(o.left)
    if (!_hasLeftDestinedQuantifier(o)) return o
    let rightExpr = o.right
    let leftExpr = o.left
    const leftQuantifiers = []
    const rightQuantifiers = []
    while (leftExpr.type === 'QuantifiedExpression') {
      leftQuantifiers.push([leftExpr.quantifier, leftExpr.variable.name])
      leftExpr = leftExpr.expression
    }
    while (rightExpr.type === 'QuantifiedExpression') {
      rightQuantifiers.push([rightExpr.quantifier, rightExpr.variable.name])
      rightExpr = rightExpr.expression
    }
    const quantifiers = leftQuantifiers.concat(rightQuantifiers)
    let out = {
      type: 'BinaryExpression',
      operator: o.operator,
      left: (keepLeftWrap ? leftExpr : unwrapExpression(leftExpr)),
      right: (keepRightWrap ? rightExpr : unwrapExpression(rightExpr)),
    }
    const [lastq, lastv] = quantifiers[quantifiers.length - 1]
    for (const [q, v] of quantifiers.reverse()) {
      out = {
        type: 'QuantifiedExpression',
        quantifier: q,
        variable: {
          type: 'VariableOrConstant',
          name: v,
        },
        expression: out,
      }
      if ((q === lastq) && (v === lastv)) {
        out.expression = {
          type: 'ExpressionStatement',
          expression: out.expression,
        }
      }
    }
    return out
  },
  QuantifiedExpression: t => {
    const out = clone(t)
    out.expression = moveQuantifiersLeft(out.expression)
    return out
  },
  ExpressionStatement: t => {
    let out = clone(t)
    out.expression = moveQuantifiersLeft(out.expression)
    if (out.expression.type === 'QuantifiedExpression') out = unwrapExpression(out)
    return out
  },
}, clone)

const rename = makeMultimethod({
  BinaryExpression: (t, scope = []) => {
    t.left = rename(t.left, scope)
    t.right = rename(t.right, scope)
    return t
  },
  ExpressionStatement: (t, scope = []) => {
    t.expression = rename(t.expression, scope)
    return t
  },
  FunctionExpression: (t, scope = []) => {
    t.arguments = t.arguments.map((a) => rename(a, scope))
    return t
  },
  QuantifiedExpression: (t, scope = []) => {
    scope.push(t.variable.name, true)
    t.variable.name = scope.check(t.variable.name)
    scope.quantified.push(t.variable.name)
    t.expression = rename(t.expression, scope)
    scope.quantified.pop()
    return t
  },
  UnaryExpression: (t, scope = []) => {
    t.argument = rename(t.argument, scope)
    return t
  },
  VariableOrConstant: (t, scope = []) => {
    scope.push(t.name)
    t.name = scope.check(t.name)
    return t
  },
}, clone)

module.exports = {
  collapseNegation,
  collapseNegations,
  collectNames,
  containsFree,
  markFree,
  moveQuantifiersLeft,
  negate,
  removeImplications,
  stringify,
}
