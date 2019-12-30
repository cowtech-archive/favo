export declare function quoteRegexp(raw: string): string;
export declare function niceJoin(array: Array<string>, lastSeparator?: string, separator?: string): string;
export declare function durationInMs(startTime: [number, number]): number;
export declare function get<T>(target: any, path: string, def?: T): T | undefined;
export declare function omit(source: object, properties: string | Array<string>): object;
