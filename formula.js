import parse from './parse'
import lib from './lib'

class Scope {

  constructor (names) {
    this.used = []
    this.quantified = []
    this.renames = {}
    this.available = Scope.charDiff(names)
  }

  push (item) {
    if (this.isUsed(item) && !this.isQuantified(item) && !this.hasRename(item)) {
      this.complexityCheck()
      let c = this.available.pop()
      this.renames[item] = c
      this.used.push(c)
    } else {
      this.used.push(item)
    }
  }

  check (item) {
    return this.renames[item] || item
  }

  isQuantified (item) {
    return this.quantified.indexOf(item) >= 0
  }

  isUsed (item) {
    return this.used.indexOf(item) >= 0
  }

  hasRename (item) {
    return !!this.renames[item]
  }

  complexityCheck () {
    if (!this.available.length) throw new Error('Formula too complex.')
  }
}

Scope.allChars = Array.from(new Array(26), (x, i) => i + 97)
  .map(c => String.fromCharCode(c))

Scope.charDiff = (names = []) =>
  Scope.allChars.filter((i) => names.indexOf(i) < 0)

export default class Formula {

  constructor (input = '') {
    this.input = input
    this.source = parse(input)
    this.names = lib.collectNames(this.source)
  }

  reset () {
    this.source = parse(this.input)
  }

  negate () {
    this.source = lib.negate(this.source)
  }

  collapse () {
    this.source = lib.collapseNegations(this.source)
  }

  rename () {
    this.source = lib.markFree(this.source)
    let scope = new Scope(Object.keys(this.names))
    this.source = lib.rename(this.source, scope)
    return this
  }

  get stringified () {
    return lib.stringify(this.source)
  }

  get negated () {
    return lib.stringify(lib.negate(this.source))
  }

  get collapsed () {
    return lib.stringify(lib.collapseNegations(this.source))
  }

}
