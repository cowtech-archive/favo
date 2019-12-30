export function quoteRegexp(raw: string): string {
  return raw.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1')
}

export function niceJoin(array: Array<string>, lastSeparator: string = ' and ', separator: string = ', '): string {
  switch (array.length) {
    case 0:
      return ''
    case 1:
      return array[0]
    case 2:
      return array.join(lastSeparator)
    default:
      return array.slice(0, array.length - 1).join(separator) + lastSeparator + array[array.length - 1]
  }
}

export function durationInMs(startTime: [number, number]): number {
  const hrDuration = process.hrtime(startTime)

  return hrDuration[0] * 1e3 + hrDuration[1] / 1e6
}

export function get<T>(target: any, path: string, def?: T): T | undefined {
  const tokens = path.split('.').map((t: string) => t.trim())

  for (const token of tokens) {
    if (typeof target === 'undefined' || target === null) {
      // We're supposed to be still iterating, but the chain is over - Return undefined
      target = def
      break
    }

    const index = token.match(/^(\d+)|(?:\[(\d+)\])$/)
    if (index) {
      target = target[parseInt(index[1] || index[2], 10)]
    } else {
      target = target[token]
    }
  }

  return target
}

export function omit(source: object, properties: string | Array<string>): object {
  // Deep clone the object
  const target = JSON.parse(JSON.stringify(source))

  for (const property of properties) {
    delete target[property]
  }

  return target
}
