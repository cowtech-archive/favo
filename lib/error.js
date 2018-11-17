"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const boom_1 = require("boom");
const validation_1 = require("./validation");
class ExtendedError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.ExtendedError = ExtendedError;
function serializeErrorDescription(error) {
    return `[${error.code || error.name}] ${error.message}`;
}
exports.serializeErrorDescription = serializeErrorDescription;
function serializeErrorStack(error) {
    const cwd = process.cwd();
    if (!error.stack)
        return [];
    return error.stack.split('\n').map(s => s
        .trim()
        .replace(/^at /, '')
        .replace(cwd, '$ROOT'));
}
exports.serializeErrorStack = serializeErrorStack;
function convertError(data, error) {
    const stack = serializeErrorStack(error);
    stack.shift();
    if (error.validation) {
        const prefix = error.message.split(/[\.\s\[]/).shift();
        return validation_1.convertValidationErrors(data, error.validation, prefix);
    }
    else if (error.code === 'INVALID_CONTENT_TYPE')
        return boom_1.badRequest(validation_1.validationMessages.contentType);
    else if (error.code === 'MALFORMED_JSON' || (stack[0] || '').startsWith('JSON.parse')) {
        return boom_1.badRequest(validation_1.validationMessages.json);
    }
    // Message must be passed as data otherwise Boom will hide it
    return boom_1.internal('', { message: serializeErrorDescription(error), stack });
}
exports.convertError = convertError;
