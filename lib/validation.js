"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const boom_1 = require("boom");
const lodash_get_1 = __importDefault(require("lodash.get"));
const utils_1 = require("./utils");
exports.validationMessagesFormatters = {
    minimum: (min) => `must be a number greater than or equal to ${min}`,
    maximum: (max) => `must be a number less than or equal to ${max}`,
    enum: (values) => `must be one of the following values: ${utils_1.niceJoin(values.map((f) => `"${f}"`), ' or ')}`,
    invalidResponseCode: (code) => `This endpoint cannot respond with HTTP status ${code}.`,
    invalidResponse: (code) => `The response returned from the endpoint violates its specification for the HTTP status ${code}.`
};
exports.validationMessages = {
    contentType: 'only JSON payloads are accepted. Please set the "Content-Type" header to be "application/json"',
    json: 'the body payload is not a valid JSON',
    jsonEmpty: 'the JSON body payload cannot be empty if the "Content-Type" header is set',
    missing: 'must be present',
    unknown: 'is not a valid attribute',
    emptyObject: 'cannot be a empty object',
    uuid: 'must be a valid GUID (UUID v4)',
    timestamp: 'must be a valid UTC timestamp in the format YYYY-MM-DDTHH:MM:SS.ssssssZ (example: 2018-07-06T12:34:56.123456Z)',
    date: 'must be a valid RFC 3339 date (example: 2018-07-06)',
    hostname: 'must be a valid hostname',
    ip: 'must be a valid IPv4 or IPv6',
    integer: 'must be a valid integer number',
    number: 'must be a valid number',
    boolean: 'must be a valid boolean (true or false)',
    object: 'must be a object',
    array: 'must be an array',
    string: 'must be a string',
    presentString: 'must be a non empty string'
};
function convertValidationErrors(data, validationErrors, prefix, stripPrefix) {
    const errors = {};
    for (const e of validationErrors) {
        // For each error
        let section = prefix;
        let baseKey = e.dataPath.substring(e.dataPath.startsWith('.') ? 1 : 0);
        let key = baseKey;
        let message = '';
        if (section === 'querystring') {
            section = 'query';
        }
        const value = lodash_get_1.default(data, `${section}.${key}`);
        // Depending on the type
        switch (e.keyword) {
            case 'required':
            case 'dependencies':
                key = e.params.missingProperty;
                message = exports.validationMessages.missing;
                break;
            case 'additionalProperties':
                key = e.params.additionalProperty;
                message = exports.validationMessages.unknown;
                break;
            case 'minProperties':
                message = exports.validationMessages.emptyObject;
                break;
            case 'type':
                message = exports.validationMessages[e.params.type];
                break;
            case 'minimum':
                message = exports.validationMessagesFormatters.minimum(e.params.limit);
                break;
            case 'maximum':
                message = exports.validationMessagesFormatters.maximum(e.params.limit);
                break;
            case 'number':
                message = exports.validationMessages.number;
                break;
            case 'enum':
                message = exports.validationMessagesFormatters.enum(e.params.allowedValues);
                break;
            case 'pattern':
                const pattern = e.params.pattern;
                if (pattern === '.+' || (!value || !value.length)) {
                    message = exports.validationMessages.presentString;
                }
                else if (key === 'fields') {
                    const name = pattern.match(/^\^\(\?\<([a-zA-Z]+)\>.+/)[1];
                    message = exports.validationMessagesFormatters.fields(name);
                }
                else {
                    message = e.message.replace(/\(\?\:/g, '(');
                }
                break;
            case 'format':
                let reason = e.params.format;
                // Normalize the key
                if (reason === 'ipv4' || reason === 'ipv6')
                    reason = 'ip';
                else if (reason === 'date-time')
                    reason = 'timestamp';
                message = exports.validationMessagesFormatters[reason]
                    ? exports.validationMessagesFormatters[reason](reason)
                    : exports.validationMessages[reason];
                break;
        }
        if (message) {
            let property = Array.from(new Set([baseKey, key].filter((p) => p)))
                .join('.')
                .replace(/[\[\]]/g, '');
            if (stripPrefix)
                property = property.replace(stripPrefix, '');
            errors[property] = message;
        }
    }
    return boom_1.badData('Bad input data.', { errors: prefix ? { [prefix]: errors } : errors });
}
exports.convertValidationErrors = convertValidationErrors;
