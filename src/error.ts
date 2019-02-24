import { ValidationError } from 'ajv'
import Boom, { badRequest, internal } from 'boom'
import upperFirst from 'lodash.upperfirst'
import { Schema } from './spec'
import { convertValidationErrors, validationMessages } from './validation'

export type NodeError = NodeJS.ErrnoException

export type BoomError<T> = (message?: string, data?: T) => Boom<T>
export type GenericError = Error | ValidationError | Boom

export function isValidationError(error: GenericError): error is ValidationError {
  return (error as ValidationError).validation
}

export function isBoomError(error: GenericError): error is Boom {
  return (error as Boom).isBoom
}

export function serializeErrorDescription(error: GenericError): string {
  return `[${(error as NodeError).code || error.name}] ${error.message}`
}

export function serializeErrorStack(error: Error): Array<string> {
  const cwd = process.cwd()
  if (!error.stack) {
    return []
  }

  return error.stack.split('\n').map((s: string) =>
    s
      .trim()
      .replace(/^at /, '')
      .replace(cwd, '$ROOT')
  )
}

export function toBoomError(error: GenericError, data?: Schema): Boom {
  const stack = serializeErrorStack(error)
  const code = (error as NodeError).code
  const message = error.message
  stack.shift()

  if (isBoomError(error)) {
    return error
  } else if (isValidationError(error)) {
    const prefix = message.split(/[\.\s\[]/).shift()
    return convertValidationErrors(data!, error.errors || error.validation, prefix!)
  } else if (code === 'INVALID_CONTENT_TYPE' || code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE') {
    return badRequest(upperFirst(validationMessages.contentType))
  } else if (code === 'FST_ERR_CTP_EMPTY_JSON_BODY') {
    return badRequest(upperFirst(validationMessages.jsonEmpty))
  } else if (code === 'MALFORMED_JSON' || message === 'Invalid JSON' || (stack[0] || '').startsWith('JSON.parse')) {
    return badRequest(upperFirst(validationMessages.json))
  }

  // Message must be passed as data otherwise Boom will hide it
  return internal('', { message: serializeErrorDescription(error), stack })
}
