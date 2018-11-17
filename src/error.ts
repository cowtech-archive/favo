import { ErrorObject } from 'ajv'
import Boom, { badRequest, internal } from 'boom'
import { Schema } from './spec'
import { convertValidationErrors, validationMessages } from './validation'

export type BoomError<T> = (message?: string, data?: T) => Boom<T>

export class ExtendedError extends Error {
  code: string
  validation?: Array<ErrorObject>

  constructor(code: string, message?: string) {
    super(message)

    this.code = code
  }
}

export function serializeErrorDescription(error: ExtendedError): string {
  return `[${error.code || error.name}] ${error.message}`
}

export function serializeErrorStack(error: Error): Array<string> {
  const cwd = process.cwd()
  if (!error.stack) return []

  return error.stack.split('\n').map(s =>
    s
      .trim()
      .replace(/^at /, '')
      .replace(cwd, '$ROOT')
  )
}

export function convertError(data: Schema, error: ExtendedError): Boom {
  const stack = serializeErrorStack(error)
  stack.shift()

  if (error.validation) {
    const prefix = error.message.split(/[\.\s\[]/).shift()
    return convertValidationErrors(data, error.validation, prefix!)
  } else if (error.code === 'INVALID_CONTENT_TYPE') return badRequest(validationMessages.contentType)
  else if (error.code === 'MALFORMED_JSON' || (stack[0] || '').startsWith('JSON.parse')) {
    return badRequest(validationMessages.json)
  }

  // Message must be passed as data otherwise Boom will hide it
  return internal('', { message: serializeErrorDescription(error), stack })
}
