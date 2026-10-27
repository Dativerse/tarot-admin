import { z } from "zod";
import { EnvelopeSchema, type ServerErrorCode } from "@/api/schemas";

/** What went wrong: a code from the Admin API, or UNAVAILABLE when no answer came from it. */
export type ErrorCode = ServerErrorCode | "UNAVAILABLE";

/** An entry of a response's `errors`, or the one made up here when the Admin API didn't answer. */
export type ErrorEntry = { code: ErrorCode; metadata: Record<string, unknown> | null };

/** A request that failed with errors. The first one decides how the UI reacts. */
export class ApiError extends Error {
  /** Every error; usually just one. */
  readonly errors: ErrorEntry[];
  readonly code: ErrorCode;
  /** The first error's metadata, or null when it has none. */
  readonly metadata: Record<string, unknown> | null;

  constructor(errors: ErrorEntry[]) {
    super(errors.map((e) => e.code).join(", "));
    this.name = "ApiError";
    this.errors = errors;
    this.code = errors[0].code;
    this.metadata = errors[0].metadata;
  }
}

const failure = (code: ErrorCode) => new ApiError([{ code, metadata: null }]);

/** The response did not match the contract in schemas.ts: the back-end changed. */
export class ContractError extends Error {
  readonly issues: z.core.$ZodIssue[];

  constructor(path: string, error: z.ZodError) {
    super(`Unexpected response from ${path}: ${z.prettifyError(error)}`);
    this.name = "ContractError";
    this.issues = error.issues;
  }
}

type Options = Omit<RequestInit, "body"> & { body?: unknown };

async function send(path: string, { body, headers, ...init }: Options = {}): Promise<Response> {
  try {
    return await fetch(path, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // fetch only rejects when no response arrived: the API, or the proxy in front of it, is down.
    throw failure("UNAVAILABLE");
  }
}

/** The body as JSON, or undefined when it is empty or not JSON. */
async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : undefined;
  } catch {
    return undefined;
  }
}

/** Parses `json` with `schema`, or fails loudly with a ContractError. */
function parse<S extends z.ZodType>(schema: S, path: string, json: unknown): z.infer<S> {
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const error = new ContractError(path, parsed.error);
    console.error(error);
    throw error;
  }
  return parsed.data;
}

/** Sends a request and parses the `data` of the response with `schema`; throws ApiError when it has `errors`. */
export async function request<S extends z.ZodType>(schema: S, path: string, options?: Options): Promise<z.infer<S>> {
  const response = await send(path, options);
  const json = await readJson(response);
  // The Admin API answers errors with 200 OK. An error status without a body from it came from in front of it,
  // such as a proxy whose upstream is down.
  if (!response.ok && !EnvelopeSchema.safeParse(json).success)
    throw failure(response.status >= 502 && response.status <= 504 ? "UNAVAILABLE" : "INTERNAL_ERROR");

  const { errors, data } = parse(EnvelopeSchema, path, json);
  if (errors.length > 0) throw new ApiError(errors);
  return parse(schema, path, data);
}

/** For endpoints that succeed with null data. */
export async function requestNoData(path: string, options?: Options): Promise<void> {
  await request(z.null(), path, options);
}
