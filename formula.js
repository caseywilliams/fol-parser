import parse from './parse'
import * as lib from './lib'

export default class Formula {
  constructor (input) {
    if (typeof input === 'string') {
      this.source = parse(input)
    } else if (typeof input === 'object') {
      this.source = JSON.parse(JSON.stringify(input))
    } else throw new Error(`Invalid formula input format: ${JSON.stringify(input)}`)
  }

  stringify () {
    return lib.print(this.source)
  }

  negate () {
    return new Formula(lib.negate(this.source))
  }
}
