"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const boom_1 = require("boom");
const lodash_capitalize_1 = __importDefault(require("lodash.capitalize"));
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
    return error.stack.split('\n').map((s) => s
        .trim()
        .replace(/^at /, '')
        .replace(cwd, '$ROOT'));
}
exports.serializeErrorStack = serializeErrorStack;
function convertError(data, e) {
    const stack = serializeErrorStack(e);
    stack.shift();
    if (e.validation) {
        const prefix = e.message.split(/[\.\s\[]/).shift();
        return validation_1.convertValidationErrors(data, e.validation, prefix);
    }
    else if (e.code === 'INVALID_CONTENT_TYPE')
        return boom_1.badRequest(lodash_capitalize_1.default(validation_1.validationMessages.contentType));
    else if (e.code === 'MALFORMED_JSON' || e.message === 'Invalid JSON' || (stack[0] || '').startsWith('JSON.parse')) {
        return boom_1.badRequest(lodash_capitalize_1.default(validation_1.validationMessages.json));
    }
    // Message must be passed as data otherwise Boom will hide it
    return boom_1.internal('', { message: serializeErrorDescription(e), stack });
}
exports.convertError = convertError;
