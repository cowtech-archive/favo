/// <reference types="node" />
import { IncomingMessage } from 'http';
export interface BenchmarkedIncomingMessage extends IncomingMessage {
    startTime: [number, number];
}
export declare function quoteRegexp(raw: string): string;
export declare function niceJoin(array: Array<string>, lastSeparator?: string, separator?: string): string;
export declare function durationInMs(startTime: [number, number]): number;
