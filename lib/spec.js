"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const glob_1 = require("glob");
const lodash_get_1 = __importDefault(require("lodash.get"));
const lodash_omit_1 = __importDefault(require("lodash.omit"));
const errors_1 = require("./errors");
exports.parametersSections = {
    headers: 'header',
    params: 'path',
    querystring: 'query'
};
function omitFromSchema(schema, ...properties) {
    if (schema.type !== 'object') {
        return schema;
    }
    // Deep Clone the object
    const newSchema = JSON.parse(JSON.stringify(schema));
    for (const p of properties) {
        delete newSchema.properties[p];
    }
    // Remove from requird properties, if any
    if (newSchema.required) {
        newSchema.required = newSchema.required.filter((p) => !properties.includes(p));
    }
    return newSchema;
}
exports.omitFromSchema = omitFromSchema;
class Spec {
    constructor({ title, description, authorName, authorUrl, authorEmail, license, version, servers, tags, folder }, skipDefaultErrors = false) {
        if (!license)
            license = 'MIT';
        Object.assign(this, { title, description, authorName, authorUrl, authorEmail, license, version, servers, tags });
        this.securitySchemes = {};
        this.models = {};
        this.parameters = {};
        this.responses = {};
        this.servers = [];
        this.paths = {};
        this.errors = Object.values(skipDefaultErrors ? {} : errors_1.errors).reduce((accu, e) => {
            accu[e.properties.statusCode.enum[0]] = lodash_omit_1.default(e, 'ref');
            return accu;
        }, {});
        if (folder)
            this.addFolder(folder);
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
                schemas: {
                    ...this.generateSchemaObjects(models, 'models'),
                    ...this.generateSchemaObjects(errors, 'errors')
                }
            },
            paths
        };
    }
    addModels(models) {
        for (const [name, schema] of Object.entries(models)) {
            this.models[(schema.ref || name).split('/').pop()] = lodash_omit_1.default(schema, 'ref');
        }
    }
    addSecuritySchemes(schemes) {
        Object.assign(this.securitySchemes, schemes);
    }
    addRoutes(routes) {
        if (!Array.isArray(routes))
            routes = [routes];
        // Filter only routes who have API schema defined and not hidden
        const apiRoutes = routes
            .filter(r => {
            const schema = lodash_get_1.default(r, 'schema', {});
            const config = lodash_get_1.default(r, 'config', {});
            return !schema.hide && !config.hide;
        })
            .sort((a, b) => a.url.localeCompare(b.url));
        // For each route
        for (const route of apiRoutes) {
            const schema = lodash_get_1.default(route, 'schema', {});
            const config = lodash_get_1.default(route, 'config', {});
            // OpenAPI groups by path and then method
            const path = route.url.replace(/:([a-zA-Z]+)/g, '{$1}');
            if (!this.paths[path])
                this.paths[path] = {};
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
            if (requestBody && method !== 'get' && method !== 'delete') {
                this.paths[path][route.method.toLowerCase()].requestBody = requestBody;
            }
        }
    }
    addFolder(folder) {
        for (const file of glob_1.sync(`${folder}/**/*(*.ts|*.js)`)) {
            const required = require(file);
            const routes = required.routes || [required.route];
            for (const route of routes) {
                if (route) {
                    this.addRoutes(route);
                    const models = lodash_get_1.default(route, 'meta.config.models');
                    const securitySchemes = lodash_get_1.default(route, 'meta.config.securitySchemes');
                    if (models)
                        this.addModels(models);
                    if (securitySchemes)
                        this.addSecuritySchemes(securitySchemes);
                }
            }
        }
    }
    parseSecurity(securities) {
        // Make sure it's an array
        if (!Array.isArray(securities))
            securities = [securities];
        // Transform string to the regular format, the rest is leaved as it is
        return securities.filter(s => s).map(s => (typeof s === 'string' ? { [s]: [] } : s));
    }
    parseParameters(schema) {
        let params = [];
        // For each parameter section - Cannot destructure directly to 'in' since it's a reserved keyword
        for (const [section, where] of Object.entries(exports.parametersSections)) {
            const specs = schema[section];
            // No spec defined, just ignore it
            if (typeof specs !== 'object') {
                continue;
            }
            // Get the list of required parameters
            const required = lodash_get_1.default(specs, 'required', []);
            // For each property
            for (const [name, spec] of Object.entries(lodash_get_1.default(specs, 'properties', {}))) {
                params.push({
                    name,
                    in: where,
                    description: spec.description || null,
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
            if (ref.indexOf('#/') === -1)
                ref = `#/components/schemas/${ref.replace(/\//g, '.')}`;
            return { $ref: ref };
        }
        return lodash_omit_1.default(schema, ['ref', '$ref'].concat(keysBlacklist));
    }
    generateSchemaObjects(object, prefix) {
        return Object.entries(object).reduce((accu, [k, v]) => {
            accu[`${prefix}.${k}`] = lodash_omit_1.default(v, 'ref', '$ref');
            return accu;
        }, {});
    }
}
exports.Spec = Spec;
