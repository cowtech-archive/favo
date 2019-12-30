"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const glob_1 = require("glob");
const errors_1 = require("./errors");
exports.parametersSections = {
    headers: 'header',
    params: 'path',
    querystring: 'query'
};
function omit(source, ...properties) {
    // Deep clone the object
    const target = JSON.parse(JSON.stringify(source));
    for (const property of properties) {
        delete target[property];
    }
    return target;
}
function omitFromSchema(schema, ...properties) {
    if (schema.type !== 'object') {
        return schema;
    }
    // Deep Clone the object
    const newSchema = omit(JSON.parse(JSON.stringify(schema)), ...properties);
    // Remove from requird properties, if any
    if (newSchema.required) {
        newSchema.required = newSchema.required.filter((p) => !properties.includes(p));
    }
    return newSchema;
}
exports.omitFromSchema = omitFromSchema;
class Spec {
    constructor({ title, description, authorName, authorUrl, authorEmail, license, version, servers, tags, folder }, skipDefaultErrors = false) {
        if (!license) {
            license = 'MIT';
        }
        Object.assign(this, { title, description, authorName, authorUrl, authorEmail, license, version, servers, tags });
        this.securitySchemes = {};
        this.models = {};
        this.parameters = {};
        this.responses = {};
        this.servers = [];
        this.paths = {};
        this.errors = Object.values(skipDefaultErrors ? {} : errors_1.errors).reduce((accu, e) => {
            accu[e.properties.statusCode.enum[0]] = omit(e, 'ref');
            return accu;
        }, {});
        if (folder) {
            this.addFolder(folder);
        }
    }
    generate() {
        const { title, description, authorName, authorUrl, authorEmail, license, version, servers, tags, securitySchemes, models, parameters, responses, errors, paths } = this;
        return {
            openapi: '3.0.1',
            info: {
                title,
                description,
                contact: {
                    name: authorName,
                    url: authorUrl,
                    email: authorEmail
                },
                license: {
                    name: license.toUpperCase(),
                    url: `https://choosealicense.com/licenses/${license.toLowerCase()}/`
                },
                version
            },
            servers,
            tags,
            components: {
                securitySchemes,
                parameters,
                responses,
                schemas: Object.assign(Object.assign({}, this.generateSchemaObjects(models, 'models')), this.generateSchemaObjects(errors, 'errors'))
            },
            paths
        };
    }
    addModels(models) {
        for (const [name, schema] of Object.entries(models)) {
            this.models[(schema.ref || name).replace(/^models[/.]/, '')] = omit(schema, 'ref');
        }
    }
    addSecuritySchemes(schemes) {
        Object.assign(this.securitySchemes, schemes);
    }
    addRoutes(routes) {
        var _a, _b;
        if (!Array.isArray(routes)) {
            routes = [routes];
        }
        // Filter only routes who have API schema defined and not hidden
        const apiRoutes = routes
            .filter((r) => {
            var _a, _b;
            const schema = (_a = r.schema, (_a !== null && _a !== void 0 ? _a : {}));
            const config = (_b = r.config, (_b !== null && _b !== void 0 ? _b : {}));
            return !schema.hide && !config.hide;
        })
            .sort((a, b) => a.url !== b.url ? a.url.localeCompare(b.url) : a.method.localeCompare(b.method));
        // For each route
        for (const route of apiRoutes) {
            const schema = (_a = route.schema, (_a !== null && _a !== void 0 ? _a : {}));
            const config = (_b = route.config, (_b !== null && _b !== void 0 ? _b : {}));
            // OpenAPI groups by path and then method
            const path = route.url.replace(/:([a-zA-Z_]+)/g, '{$1}');
            if (!this.paths[path]) {
                this.paths[path] = {};
            }
            // Add the route to the spec
            const method = route.method.toLowerCase();
            const requestBody = this.parsePayload(schema);
            this.paths[path][method] = {
                summary: config.description,
                tags: config.tags,
                security: this.parseSecurity(config.security),
                parameters: this.parseParameters(schema),
                responses: this.parseResponses(schema.response || {})
            };
            if (requestBody && ['put', 'patch', 'post'].includes(method)) {
                this.paths[path][route.method.toLowerCase()].requestBody = requestBody;
            }
        }
    }
    addFolder(folder) {
        var _a, _b, _c, _d;
        for (const file of glob_1.sync(`${folder}/**/*(*.ts|*.js)`)) {
            const required = require(file);
            const routes = required.routes || [required.route];
            for (const route of routes) {
                if (route) {
                    const models = (_b = (_a = route) === null || _a === void 0 ? void 0 : _a.config) === null || _b === void 0 ? void 0 : _b.models;
                    const securitySchemes = (_d = (_c = route) === null || _c === void 0 ? void 0 : _c.config) === null || _d === void 0 ? void 0 : _d.securitySchemes;
                    if (models) {
                        this.addModels(models);
                    }
                    if (securitySchemes) {
                        if (!route.config.security) {
                            route.config.security = [];
                        }
                        else if (typeof route.config.security === 'string') {
                            route.config.security = [route.config.security];
                        }
                        for (const scheme of Object.keys(securitySchemes)) {
                            route.config.security.push(scheme);
                        }
                        this.addSecuritySchemes(securitySchemes);
                    }
                    this.addRoutes(route);
                }
            }
        }
    }
    parseSecurity(securities) {
        // Make sure it's an array
        if (!Array.isArray(securities)) {
            securities = [securities];
        }
        // Transform string to the regular format, the rest is leaved as it is
        return securities
            .filter((s) => s)
            .map((s) => (typeof s === 'string' ? { [s]: [] } : s));
    }
    parseParameters(schema) {
        var _a, _b;
        let params = [];
        // For each parameter section - Cannot destructure directly to 'in' since it's a reserved keyword
        for (const [section, where] of Object.entries(exports.parametersSections)) {
            const specs = schema[section];
            // No spec defined, just ignore it
            if (typeof specs !== 'object') {
                continue;
            }
            // Get the list of required parameters
            const required = (_a = specs.required, (_a !== null && _a !== void 0 ? _a : []));
            // For each property
            for (const [name, spec] of Object.entries((_b = specs.properties, (_b !== null && _b !== void 0 ? _b : {})))) {
                params.push({
                    name,
                    in: where,
                    description: specs.description,
                    required: required.includes(name),
                    schema: this.resolveReference(spec, 'description', 'components')
                });
            }
        }
        return params;
    }
    parsePayload(schema) {
        // No spec defined, just ignore it
        if (!schema || typeof schema.body !== 'object') {
            return null;
        }
        return {
            description: schema.body.description,
            content: {
                'application/json': {
                    schema: this.resolveReference(schema.body, 'description')
                }
            }
        };
    }
    parseResponses(responses) {
        const parsed = {};
        // For each response code
        for (const [code, originalResponse] of Object.entries(responses)) {
            const { description, raw, empty } = originalResponse;
            let spec = { description };
            // Special handling for raw responses
            if (raw) {
                spec.content = { [raw]: {} };
            }
            else if (!empty) {
                // Regular response
                spec.content = {
                    'application/json': {
                        schema: this.resolveReference(originalResponse, 'description', 'raw', 'empty', 'components')
                    }
                };
            }
            parsed[code] = spec;
        }
        return parsed;
    }
    resolveReference(schema, ...keysBlacklist) {
        if (schema.$ref || schema.ref) {
            let ref = schema.$ref || schema.ref;
            if (ref.indexOf('#/') === -1) {
                ref = `#/components/schemas/${ref.replace(/\//g, '.')}`;
            }
            return { $ref: ref };
        }
        return omit(schema, ...['ref', '$ref'].concat(keysBlacklist));
    }
    generateSchemaObjects(object, prefix) {
        return Object.entries(object).reduce((accu, [k, v]) => {
            accu[`${prefix}.${k}`] = omit(v, 'ref', '$ref');
            return accu;
        }, {});
    }
}
exports.Spec = Spec;
