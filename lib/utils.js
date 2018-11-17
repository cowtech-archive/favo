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
