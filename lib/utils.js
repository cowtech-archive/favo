"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function quoteRegexp(raw) {
    return raw.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
}
exports.quoteRegexp = quoteRegexp;
function niceJoin(array, lastSeparator = ' and ', separator = ', ') {
    switch (array.length) {
        case 0:
            return '';
        case 1:
            return array[0];
        case 2:
            return array.join(lastSeparator);
        default:
            return array.slice(0, array.length - 1).join(separator) + lastSeparator + array[array.length - 1];
    }
}
exports.niceJoin = niceJoin;
function durationInMs(startTime) {
    const hrDuration = process.hrtime(startTime);
    return hrDuration[0] * 1e3 + hrDuration[1] / 1e6;
}
exports.durationInMs = durationInMs;
function get(target, path, def) {
    const tokens = path.split('.').map((t) => t.trim());
    for (const token of tokens) {
        if (typeof target === 'undefined' || target === null) {
            // We're supposed to be still iterating, but the chain is over - Return undefined
            target = def;
            break;
        }
        const index = token.match(/^(\d+)|(?:\[(\d+)\])$/);
        if (index) {
            target = target[parseInt(index[1] || index[2], 10)];
        }
        else {
            target = target[token];
        }
    }
    return target;
}
exports.get = get;
function omit(source, properties) {
    // Deep clone the object
    const target = JSON.parse(JSON.stringify(source));
    for (const property of properties) {
        delete target[property];
    }
    return target;
}
exports.omit = omit;
