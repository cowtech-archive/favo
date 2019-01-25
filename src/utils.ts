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
