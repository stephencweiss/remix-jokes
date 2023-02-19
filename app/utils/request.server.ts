import { json } from "@remix-run/node";

/**
 * This helper function helps us return an accurate HTTP status, 400 Bad Request, to the client
 */
export const badRequest = <T>(data: T) => {
  return json<T>(data, {status: 400});
};
