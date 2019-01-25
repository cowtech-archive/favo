import { IncomingMessage, ServerResponse } from 'http'

export type GlobalState = { [key: string]: any }

export type ExpressMiddleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next?: (err?: Error | boolean) => void
) => void

export type RequestHandler = (req: any, res: any) => void | Promise<any>

export type HTTPMethod = 'DELETE' | 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT' | 'OPTIONS'

export interface Route<T extends ExpressMiddleware | RequestHandler = RequestHandler> {
  method: HTTPMethod | Array<HTTPMethod>
  url: string
  handler: T
  path?: string
  prefix?: string
  schema?: {
    body?: any
    querystring?: any
    params?: any
    response?: {
      [code: number]: any
      [code: string]: any
    }
  }
  config?: any
}

export const environment: string = process.env.NODE_ENV! || 'development'

export const globalState: GlobalState = {
  currentRequest: 0,
  startTime: process.hrtime()
}
