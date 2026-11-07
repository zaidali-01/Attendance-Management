import "server-only";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Postgres errors caused by bad input, shown as a normal 4xx message instead of a server error. */
const PG_CLIENT_ERRORS: Record<string, [number, string]> = {
  "23503": [400, "That student no longer exists"], // foreign key violation
  "23505": [409, "That already exists"], // unique violation
  "22P02": [400, "Some of the data is in the wrong format"], // invalid text representation
  "22003": [400, "A number is out of range"], // numeric value out of range
  "22007": [400, "Invalid date"], // invalid datetime format
  "22008": [400, "Invalid date"], // datetime field overflow
};

/** Wraps a route handler so thrown errors become JSON responses. Internal details are never sent to the browser. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) {
        return Response.json({ error: err.message }, { status: err.status });
      }
      const code = (err as { code?: unknown })?.code;
      if (typeof code === "string" && PG_CLIENT_ERRORS[code]) {
        const [status, message] = PG_CLIENT_ERRORS[code];
        return Response.json({ error: message }, { status });
      }
      console.error(err);
      const message =
        process.env.NODE_ENV === "production" ? "Something went wrong on the server. Please try again." : err instanceof Error ? err.message : "Unexpected server error";
      return Response.json({ error: message }, { status: 500 });
    }
  };
}

const MAX_INT = 2_147_483_647;

/** A positive database id (fits in a Postgres INT). */
export function isId(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v > 0 && v <= MAX_INT;
}

export function parseId(raw: string | null | undefined): number {
  const id = Number(raw);
  if (!isId(id)) throw new HttpError(400, "Invalid id");
  return id;
}

export async function readJson<T>(req: Request): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
  if (body === null || typeof body !== "object") throw new HttpError(400, "Request body must be a JSON object");
  return body as T;
}

/** Parses ?year=&month= (month 1–12). */
export function parseMonth(params: URLSearchParams): { year: number; month: number } {
  const year = Number(params.get("year"));
  const month = Number(params.get("month"));
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new HttpError(400, "Choose a valid month");
  }
  return { year, month };
}
