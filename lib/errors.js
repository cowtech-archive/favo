"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const http_status_codes_1 = require("http-status-codes");
function buildError(statusCode, description, properties = {}, required = [], additionalProperties = false) {
    const error = http_1.STATUS_CODES[statusCode];
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
    };
}
exports.errors = {
    badRequest: buildError(http_status_codes_1.BAD_REQUEST, 'Error returned when the client payload is either invalid, malformed or has logical validation errors.', {
        errors: { type: 'object', additionalProperties: true },
        failedValidations: { type: 'object', additionalProperties: true }
    }),
    unauthorized: buildError(http_status_codes_1.UNAUTHORIZED, 'Error returned when client does not provide any valid authorization.'),
    forbidden: buildError(http_status_codes_1.FORBIDDEN, 'Error returned when client is not authorized to access the requested resource.'),
    notFound: buildError(http_status_codes_1.NOT_FOUND, 'Error returned when the requested resource is not found.'),
    methodNotAllowed: buildError(http_status_codes_1.METHOD_NOT_ALLOWED, 'Error returned when the requested method resource is not available.'),
    notAcceptable: buildError(http_status_codes_1.NOT_ACCEPTABLE, 'Error returned when the server is not able to accept the request.'),
    conflict: buildError(http_status_codes_1.CONFLICT, 'Error returned when the requested resource already existss.'),
    unsupportedType: buildError(http_status_codes_1.UNSUPPORTED_MEDIA_TYPE, 'Error returned when the server is not able to accept the request media type.'),
    internalServerError: buildError(http_status_codes_1.INTERNAL_SERVER_ERROR, 'Error returned when a unexpected error was thrown by the server.', {
        stack: { type: 'array', items: { type: 'string', pattern: '.+' } },
        errors: { type: 'object', additionalProperties: true },
        failedValidations: { type: 'object', additionalProperties: true }
    }),
    gatewayError: buildError(http_status_codes_1.BAD_GATEWAY, 'Error returned when a unexpected error was thrown by a upstream server.'),
    gatewayTimeout: buildError(http_status_codes_1.GATEWAY_TIMEOUT, 'Error returned when a upstream server timed out.')
};
