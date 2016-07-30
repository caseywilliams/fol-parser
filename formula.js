import parse from './parse'
import lib from './lib'

var Scope = function (names) {
  this.used = []
  this.quantified = []
  this.renames = {}
  this.available = Scope.charDiff(names)
}

Scope.prototype.push = function (item, isNew = false) {
  this.complexityCheck()
  if (this.isUsed(item) && !this.isQuantified(item) && (!this.hasRename(item) || isNew)) {
    let c = this.available.pop()
    this.renames[item] = c
    this.used.push(c)
  } else {
    if (!this.isUsed(item)) this.used.push(item)
  }
}

Scope.prototype.check = function (item) {
  return this.renames[item] || item
}
Scope.prototype.isQuantified = function (item) {
  return this.quantified.indexOf(item) >= 0
}

Scope.prototype.isUsed = function (item) {
  return this.used.indexOf(item) >= 0
}

Scope.prototype.hasRename = function (item) {
  return !!this.renames[item]
}

Scope.prototype.complexityCheck = function () {
  if (!this.available.length) throw new Error('Formula too complex.')
}

Scope.allChars = Array.from(new Array(26), (x, i) => i + 97)
  .map(c => String.fromCharCode(c))

Scope.charDiff = (names = []) =>
  Scope.allChars.filter((i) => names.indexOf(i) < 0)

var Formula = function (input = '') {
  this.input = input
  this.initialize()
}

Formula.prototype.initialize = function () {
  if (typeof this.input === 'string') {
    this.source = parse(this.input)
  } else if (
    this.input !== null &&
    typeof this.input === 'object' &&
    !!this.input.type
  ) {
    this.source = Object.create(this.input)
  } else {
    throw new Error(
      'Tried to create a formula from unusable input: ' +
      JSON.stringify(this.input)
    )
  }
}

Formula.prototype.negate = function () {
  return new Formula(lib.negate(this.source))
}

Formula.prototype.collapseNegations = function () {
  return new Formula(lib.collapseNegations(this.source))
}

Formula.prototype.rename = function () {
  const scope = new Scope(Object.keys(lib.collectNames(this.source)))
  return new Formula(lib.rename(this.source, scope))
}

Formula.prototype.stringify = function () {
  return lib.stringify(this.source)
}

export default Formula
