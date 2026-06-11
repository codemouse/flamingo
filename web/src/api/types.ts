/**
 * Convenience re-exports for working with the generated OpenAPI types.
 *
 * Generated types live in `./generated/schema.d.ts` and contain a `paths`
 * map keyed by URL + HTTP method, plus `components.schemas` for response
 * bodies. Most call sites only need a response type or a body type, which is
 * what these helpers extract.
 *
 * Usage:
 *   import type { ApiResponse, ApiSchema } from './api/types';
 *   type Me = ApiResponse<'/auth/me', 'get'>;
 *   type LoginBody = ApiRequestBody<'/auth/login', 'post'>;
 */
import type { paths, components } from "./generated/schema";

export type ApiPaths = paths;
export type ApiSchemas = components["schemas"];
export type ApiSchema<K extends keyof ApiSchemas> = ApiSchemas[K];

type Methods<P extends keyof paths> = Extract<keyof paths[P], string>;

/**
 * Successful (2xx) JSON response body for `<path, method>`.
 * Falls back to `unknown` when the spec has no documented response shape.
 */
export type ApiResponse<
  P extends keyof paths,
  M extends Methods<P>,
> = paths[P][M] extends {
  responses: infer R;
}
  ? // Pick the first 2xx response with content/json
    R extends Record<string, { content?: { "application/json"?: infer J } }>
    ? J extends never
      ? unknown
      : J
    : unknown
  : unknown;

/** Request JSON body for `<path, method>`, or `never` if none. */
export type ApiRequestBody<
  P extends keyof paths,
  M extends Methods<P>,
> = paths[P][M] extends {
  requestBody?: { content: { "application/json": infer B } };
}
  ? B
  : never;
