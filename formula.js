import parse from './parse'
import lib from './lib'

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
