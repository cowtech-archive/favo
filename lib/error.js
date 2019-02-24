"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const boom_1 = require("boom");
const lodash_upperfirst_1 = __importDefault(require("lodash.upperfirst"));
const validation_1 = require("./validation");
function isValidationError(error) {
    return error.validation;
}
exports.isValidationError = isValidationError;
function isBoomError(error) {
    return error.isBoom;
}
exports.isBoomError = isBoomError;
function serializeErrorDescription(error) {
    return `[${error.code || error.name}] ${error.message}`;
}
exports.serializeErrorDescription = serializeErrorDescription;
function serializeErrorStack(error) {
    const cwd = process.cwd();
    if (!error.stack) {
        return [];
    }
    return error.stack.split('\n').map((s) => s
        .trim()
        .replace(/^at /, '')
        .replace(cwd, '$ROOT'));
}
exports.serializeErrorStack = serializeErrorStack;
function toBoomError(error, data) {
    const stack = serializeErrorStack(error);
    const code = error.code;
    const message = error.message;
    stack.shift();
    if (isBoomError(error)) {
        return error;
    }
    else if (isValidationError(error)) {
        const prefix = message.split(/[\.\s\[]/).shift();
        return validation_1.convertValidationErrors(data, error.errors || error.validation, prefix);
    }
    else if (code === 'INVALID_CONTENT_TYPE' || code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE') {
        return boom_1.badRequest(lodash_upperfirst_1.default(validation_1.validationMessages.contentType));
    }
    else if (code === 'FST_ERR_CTP_EMPTY_JSON_BODY') {
        return boom_1.badRequest(lodash_upperfirst_1.default(validation_1.validationMessages.jsonEmpty));
    }
    else if (code === 'MALFORMED_JSON' || message === 'Invalid JSON' || (stack[0] || '').startsWith('JSON.parse')) {
        return boom_1.badRequest(lodash_upperfirst_1.default(validation_1.validationMessages.json));
    }
    // Message must be passed as data otherwise Boom will hide it
    return boom_1.internal('', { message: serializeErrorDescription(error), stack });
}
exports.toBoomError = toBoomError;
