/// <reference types="node" />
import { IncomingMessage, ServerResponse } from 'http';
export declare type GlobalState = {
    [key: string]: any;
};
export declare type ExpressMiddleware = (req: IncomingMessage, res: ServerResponse, next?: (err?: Error | boolean) => void) => void;
export declare type RequestHandler = (req: any, res: any) => void | Promise<any>;
export declare type HTTPMethod = 'DELETE' | 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT' | 'OPTIONS';
export interface Route<T extends ExpressMiddleware | RequestHandler = RequestHandler> {
    method: HTTPMethod | Array<HTTPMethod>;
    url: string;
    handler: T;
    path?: string;
    prefix?: string;
    schema?: {
        body?: any;
        querystring?: any;
        params?: any;
        response?: {
            [code: number]: any;
            [code: string]: any;
        };
    };
    config?: any;
}
export declare const environment: string;
export declare const globalState: GlobalState;
