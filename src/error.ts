import { ErrorObject } from 'ajv'
import Boom, { badRequest, internal } from 'boom'
import capitalize from 'lodash.capitalize'
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

  return error.stack.split('\n').map((s: string) =>
    s
      .trim()
      .replace(/^at /, '')
      .replace(cwd, '$ROOT')
  )
}

export function convertError(data: Schema, e: ExtendedError): Boom {
  const stack = serializeErrorStack(e)
  stack.shift()

  if (e.validation) {
    const prefix = e.message.split(/[\.\s\[]/).shift()
    return convertValidationErrors(data, e.validation, prefix!)
  } else if (e.code === 'INVALID_CONTENT_TYPE') return badRequest(capitalize(validationMessages.contentType))
  else if (e.code === 'MALFORMED_JSON' || e.message === 'Invalid JSON' || (stack[0] || '').startsWith('JSON.parse')) {
    return badRequest(capitalize(validationMessages.json))
  }

  // Message must be passed as data otherwise Boom will hide it
  return internal('', { message: serializeErrorDescription(e), stack })
}
