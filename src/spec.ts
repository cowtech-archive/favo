import { sync as glob } from 'glob'
import { SecurityScheme, SecuritySchemeDefinition } from './authentication'
import { errors } from './errors'
import { Route } from './models'

export type Schema = { [key: string]: any }

export interface Tag {
  name: string
  description: string
}

export interface Server {
  url: string
  description: string
}

export interface Response {
  [code: number]: Object
}

export interface SchemaBaseInfo {
  title?: string
  description?: string
  authorName?: string
  authorUrl?: string
  authorEmail?: string
  license?: string
  version?: string
  tags?: Array<Tag>
  servers: Array<Server>
  folder?: string
}

export const parametersSections: { [key: string]: string } = {
  headers: 'header',
  params: 'path',
  querystring: 'query'
}

function omit(source: object, ...properties: Array<string>): object {
  // Deep clone the object
  const target = JSON.parse(JSON.stringify(source))

  for (const property of properties) {
    delete target[property]
  }

  return target
}

export function omitFromSchema(schema: Schema, ...properties: Array<string>): Schema {
  if (schema.type !== 'object') {
    return schema
  }

  // Deep Clone the object
  const newSchema: Schema = omit(JSON.parse(JSON.stringify(schema)), ...properties)

  // Remove from requird properties, if any
  if (newSchema.required) {
    newSchema.required = newSchema.required.filter((p: string) => !properties.includes(p))
  }

  return newSchema
}

export class Spec implements SchemaBaseInfo {
  // User provided
  title?: string
  description?: string
  authorName?: string
  authorUrl?: string
  authorEmail?: string
  license?: string
  version?: string
  tags?: Array<Tag>
  servers: Array<Server>
  // Internally set
  securitySchemes: Schema
  models: Schema
  parameters: Schema
  responses: Schema
  errors: Schema
  paths: Schema

  constructor(
    { title, description, authorName, authorUrl, authorEmail, license, version, servers, tags, folder }: SchemaBaseInfo,
    skipDefaultErrors: boolean = false
  ) {
    if (!license) {
      license = 'MIT'
    }

    Object.assign(this, { title, description, authorName, authorUrl, authorEmail, license, version, servers, tags })

    this.securitySchemes = {}
    this.models = {}
    this.parameters = {}
    this.responses = {}
    this.servers = []
    this.paths = {}

    this.errors = Object.values(skipDefaultErrors ? {} : errors).reduce<Schema>((accu: Schema, e: Schema) => {
      accu[e.properties.statusCode.enum[0]] = omit(e, 'ref')
      return accu
    }, {})

    if (folder) {
      this.addFolder(folder)
    }
  }

  generate(): Schema {
    const {
      title,
      description,
      authorName,
      authorUrl,
      authorEmail,
      license,
      version,
      servers,
      tags,
      securitySchemes,
      models,
      parameters,
      responses,
      errors,
      paths
    } = this

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
          name: license!.toUpperCase(),
          url: `https://choosealicense.com/licenses/${license!.toLowerCase()}/`
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
    }
  }

  addModels(models: { [key: string]: Schema }): void {
    for (const [name, schema] of Object.entries(models)) {
      this.models[(schema.ref || name).replace(/^models[/.]/, '')] = omit(schema, 'ref')
    }
  }

  addSecuritySchemes(schemes: { [key: string]: SecurityScheme }): void {
    Object.assign(this.securitySchemes, schemes)
  }

  addRoutes(routes: Route | Array<Route>): void {
    if (!Array.isArray(routes)) {
      routes = [routes]
    }

    // Filter only routes who have API schema defined and not hidden
    const apiRoutes = routes
      .filter((r: Route) => {
        const schema = (r.schema ?? {}) as Schema
        const config = (r.config ?? {}) as Schema

        return !schema.hide && !config.hide
      })
      .sort((a: Route, b: Route) =>
        a.url !== b.url ? a.url.localeCompare(b.url) : (a.method as string).localeCompare(b.method as string)
      )

    // For each route
    for (const route of apiRoutes) {
      const schema = (route.schema ?? {}) as Schema
      const config = (route.config ?? {}) as Schema

      // OpenAPI groups by path and then method
      const path = route.url.replace(/:([a-zA-Z_]+)/g, '{$1}')
      if (!this.paths[path]) {
        this.paths[path] = {}
      }

      // Add the route to the spec
      const method = (route.method as string).toLowerCase()
      const requestBody = this.parsePayload(schema)

      this.paths[path][method] = {
        summary: config.description,
        tags: config.tags,
        security: this.parseSecurity(config.security),
        parameters: this.parseParameters(schema),
        responses: this.parseResponses(schema.response || {})
      }

      if (requestBody && ['put', 'patch', 'post'].includes(method)) {
        this.paths[path][(route.method as string).toLowerCase()].requestBody = requestBody
      }
    }
  }

  addFolder(folder: string): void {
    for (const file of glob(`${folder}/**/*(*.ts|*.js)`)) {
      const required = require(file)
      const routes: Array<Route | undefined> = required.routes || [required.route]

      for (const route of routes) {
        if (route) {
          const models = route?.config?.models as { [key: string]: Schema }
          const securitySchemes = route?.config?.securitySchemes as { [key: string]: SecurityScheme }

          if (models) {
            this.addModels(models)
          }
          if (securitySchemes) {
            if (!route.config.security) {
              route.config.security = []
            } else if (typeof route.config.security === 'string') {
              route.config.security = [route.config.security]
            }

            for (const scheme of Object.keys(securitySchemes)) {
              route.config.security.push(scheme)
            }

            this.addSecuritySchemes(securitySchemes)
          }

          this.addRoutes(route)
        }
      }
    }
  }

  private parseSecurity(securities: SecuritySchemeDefinition | Array<SecuritySchemeDefinition>): Array<Schema> {
    // Make sure it's an array
    if (!Array.isArray(securities)) {
      securities = [securities]
    }

    // Transform string to the regular format, the rest is leaved as it is
    return (securities as Array<SecuritySchemeDefinition>)
      .filter((s: SecuritySchemeDefinition) => s)
      .map((s: SecuritySchemeDefinition) => (typeof s === 'string' ? { [s]: [] } : s))
  }

  private parseParameters(schema: Schema): Schema {
    let params = []

    // For each parameter section - Cannot destructure directly to 'in' since it's a reserved keyword
    for (const [section, where] of Object.entries(parametersSections)) {
      const specs = schema[section]

      // No spec defined, just ignore it
      if (typeof specs !== 'object') {
        continue
      }

      // Get the list of required parameters
      const required: Array<string> = specs.required ?? []

      // For each property
      for (const [name, spec] of Object.entries((specs.properties ?? {}) as { [key: string]: Schema })) {
        params.push({
          name,
          in: where,
          description: specs.description,
          required: required.includes(name),
          schema: this.resolveReference(spec, 'description', 'components')
        })
      }
    }

    return params
  }

  private parsePayload(schema: Schema): Schema | null {
    // No spec defined, just ignore it
    if (!schema || typeof schema.body !== 'object') {
      return null
    }

    return {
      description: schema.body.description,
      content: {
        'application/json': {
          schema: this.resolveReference(schema.body, 'description')
        }
      }
    }
  }

  private parseResponses(responses: Response): Schema {
    const parsed: Schema = {}

    // For each response code
    for (const [code, originalResponse] of Object.entries(responses)) {
      const { description, raw, empty } = originalResponse as { [key: string]: string }
      let spec: Schema = { description }

      // Special handling for raw responses
      if (raw) {
        spec.content = { [raw]: {} }
      } else if (!empty) {
        // Regular response
        spec.content = {
          'application/json': {
            schema: this.resolveReference(originalResponse, 'description', 'raw', 'empty', 'components')
          }
        }
      }

      parsed[code] = spec
    }

    return parsed
  }

  private resolveReference(schema: Schema, ...keysBlacklist: Array<string>): Schema {
    if (schema.$ref || schema.ref) {
      let ref = schema.$ref || schema.ref
      if (ref.indexOf('#/') === -1) {
        ref = `#/components/schemas/${ref.replace(/\//g, '.')}`
      }

      return { $ref: ref }
    }

    return omit(schema, ...['ref', '$ref'].concat(keysBlacklist))
  }

  private generateSchemaObjects(object: Schema, prefix: string): Schema {
    return Object.entries(object).reduce((accu: Schema, [k, v]: [string, any]) => {
      accu[`${prefix}.${k}`] = omit(v, 'ref', '$ref')
      return accu
    }, {} as Schema)
  }
}
