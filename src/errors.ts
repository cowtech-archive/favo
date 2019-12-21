import { STATUS_CODES } from 'http'
import {
  BAD_GATEWAY,
  BAD_REQUEST,
  CONFLICT,
  FORBIDDEN,
  GATEWAY_TIMEOUT,
  INTERNAL_SERVER_ERROR,
  METHOD_NOT_ALLOWED,
  NOT_ACCEPTABLE,
  NOT_FOUND,
  UNAUTHORIZED,
  UNSUPPORTED_MEDIA_TYPE
} from 'http-status-codes'
import { Schema } from './spec'

function buildError(
  statusCode: number,
  description: string,
  properties: { [key: string]: Schema } = {},
  required: Array<string> = [],
  additionalProperties: boolean = false
): Schema {
  const error = STATUS_CODES[statusCode]!

  return {
    type: 'object',
    ref: `errors/${statusCode}`,
    description,
    properties: {
      statusCode: { type: 'number', description: 'The error code', enum: [statusCode], example: statusCode },
      error: { type: 'string', description: 'The error title', enum: [error], example: error },
      message: {
        type: 'string',
        description: 'The error message',
        pattern: '.+',
        example: `${error}.`
      },
      code: {
        type: 'string',
        description: 'The error internal code',
        pattern: '.+',
        example: error.toUpperCase().replace(/\s+/g, '_')
      },
      ...properties
    },
    required: ['statusCode', 'error', 'message', ...required],
    additionalProperties
  }
}

export const errors: { [key: string]: Schema } = {
  badRequest: buildError(
    BAD_REQUEST,
    'Error returned when the client payload is either invalid, malformed or has logical validation errors.',
    {
      errors: { type: 'object', additionalProperties: true },
      failedValidations: { type: 'object', additionalProperties: true }
    }
  ),
  unauthorized: buildError(UNAUTHORIZED, 'Error returned when client does not provide any valid authorization.'),
  forbidden: buildError(FORBIDDEN, 'Error returned when client is not authorized to access the requested resource.'),
  notFound: buildError(NOT_FOUND, 'Error returned when the requested resource is not found.'),
  methodNotAllowed: buildError(
    METHOD_NOT_ALLOWED,
    'Error returned when the requested method resource is not available.'
  ),
  notAcceptable: buildError(NOT_ACCEPTABLE, 'Error returned when the server is not able to accept the request.'),
  conflict: buildError(CONFLICT, 'Error returned when the requested resource already existss.'),
  unsupportedType: buildError(
    UNSUPPORTED_MEDIA_TYPE,
    'Error returned when the server is not able to accept the request media type.'
  ),
  internalServerError: buildError(
    INTERNAL_SERVER_ERROR,
    'Error returned when a unexpected error was thrown by the server.',
    {
      stack: { type: 'array', items: { type: 'string', pattern: '.+' } },
      errors: { type: 'object', additionalProperties: true }
    }
  ),
  gatewayError: buildError(BAD_GATEWAY, 'Error returned when a unexpected error was thrown by a upstream server.'),
  gatewayTimeout: buildError(GATEWAY_TIMEOUT, 'Error returned when a upstream server timed out.')
}
