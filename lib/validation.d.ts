import Ajv from 'ajv';
import Boom from 'boom';
import { Schema } from './spec';
export declare type validationFormatter = (...args: Array<any>) => string;
export declare const validationMessagesFormatters: {
    [key: string]: validationFormatter;
};
export declare const validationMessages: {
    [key: string]: string;
};
export declare function convertValidationErrors(data: Schema, validationErrors: Array<Ajv.ErrorObject>, prefix: string, stripPrefix?: RegExp): Boom;
