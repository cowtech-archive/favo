import { ErrorObject } from 'ajv';
import Boom from 'boom';
import { Schema } from './spec';
export declare type BoomError<T> = (message?: string, data?: T) => Boom<T>;
export declare class ExtendedError extends Error {
    code: string;
    validation?: Array<ErrorObject>;
    constructor(code: string, message?: string);
}
export declare function serializeErrorDescription(error: ExtendedError): string;
export declare function serializeErrorStack(error: Error): Array<string>;
export declare function convertError(data: Schema, e: ExtendedError): Boom;
