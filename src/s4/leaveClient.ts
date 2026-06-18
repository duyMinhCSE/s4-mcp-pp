import { executeHttpRequest } from "@sap-cloud-sdk/http-client";
import { getSession } from "../session";

const DESTINATION = "S4Q_BTP_LEAVE_BASIC";
const BASE_PATH = "/sap/opu/odata/sap/HCMFAB_LEAVE_REQUEST_CR_SRV";

export type KeyType = "string" | "int32" | "datetime";
export type KeyField = { name: string; type: KeyType; value: string };

export function resolveToken(jwt?: string, sessionId?: string): string {
  const token = jwt ?? (sessionId ? getSession(sessionId)?.userToken : undefined);
  if (!token) throw new Error("Missing JWT for principal propagation. Provide a valid sessionId.");
  return token;
}

function escapeODataString(value: string): string {
  return value.replace(/'/g, "''");
}

export function buildKeyString(keys: KeyField[]): string {
  if (keys.length === 1) {
    const { type, value } = keys[0];
    if (type === "int32") return value;
    if (type === "datetime") return `datetime'${value}'`;
    return `'${escapeODataString(value)}'`;
  }
  return keys
    .map(({ name, type, value }) => {
      if (type === "int32") return `${name}=${value}`;
      if (type === "datetime") return `${name}=datetime'${value}'`;
      return `${name}='${escapeODataString(value)}'`;
    })
    .join(",");
}

async function fetchCsrfToken(userToken: string): Promise<string> {
  const res = await executeHttpRequest(
    { destinationName: DESTINATION, jwt: userToken },
    { method: "GET", url: BASE_PATH, headers: { "X-CSRF-Token": "Fetch", Accept: "application/json" } }
  );
  const csrfToken = res.headers["x-csrf-token"] as string;
  if (!csrfToken) throw new Error("Failed to obtain CSRF token from the Leave service.");
  return csrfToken;
}

export async function listLeave(
  urlPath: string,
  queryParams?: Record<string, string>,
  jwt?: string,
  sessionId?: string
): Promise<unknown> {
  const token = resolveToken(jwt, sessionId);
  const qs =
    queryParams && Object.keys(queryParams).length
      ? "?" + new URLSearchParams(queryParams).toString()
      : "";
  const res = await executeHttpRequest(
    { destinationName: DESTINATION, jwt: token },
    { method: "GET", url: `${BASE_PATH}/${urlPath}${qs}`, headers: { Accept: "application/json" } }
  );
  return res.data;
}

function extractEmployeeId(data: unknown): string | undefined {
  const d = (data as { d?: unknown })?.d as
    | { results?: Array<Record<string, unknown>>; EmployeeID?: unknown; EmployeeNumber?: unknown }
    | undefined;
  const rec = (d?.results?.[0] ?? d) as Record<string, unknown> | undefined;
  const id = rec?.EmployeeID ?? rec?.EmployeeNumber;
  return typeof id === "string" ? id : undefined;
}

/**
 * Resolve the current user's EmployeeID from the propagated principal.
 * The Leave service returns the logged-in employee's ConfigurationSet entry,
 * so no EmployeeID has to be supplied by the caller.
 */
export async function getEmployeeId(jwt?: string, sessionId?: string): Promise<string> {
  const data = await listLeave("ConfigurationSet", undefined, jwt, sessionId);
  const id = extractEmployeeId(data);
  if (!id) {
    throw new Error("Could not determine EmployeeID from ConfigurationSet for the current principal.");
  }
  return id;
}

export async function getLeave(
  urlPath: string,
  keys: KeyField[],
  jwt?: string,
  sessionId?: string
): Promise<unknown> {
  const token = resolveToken(jwt, sessionId);
  const keyStr = buildKeyString(keys);
  const res = await executeHttpRequest(
    { destinationName: DESTINATION, jwt: token },
    { method: "GET", url: `${BASE_PATH}/${urlPath}(${keyStr})`, headers: { Accept: "application/json" } }
  );
  return res.data;
}

export async function createLeave(
  urlPath: string,
  body: object,
  jwt?: string,
  sessionId?: string
): Promise<unknown> {
  const token = resolveToken(jwt, sessionId);
  const csrfToken = await fetchCsrfToken(token);
  const res = await executeHttpRequest(
    { destinationName: DESTINATION, jwt: token },
    {
      method: "POST",
      url: `${BASE_PATH}/${urlPath}`,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      data: body,
    }
  );
  return res.data;
}

export async function updateLeave(
  urlPath: string,
  keys: KeyField[],
  body: object,
  jwt?: string,
  sessionId?: string
): Promise<unknown> {
  const token = resolveToken(jwt, sessionId);
  const csrfToken = await fetchCsrfToken(token);
  const keyStr = buildKeyString(keys);
  const res = await executeHttpRequest(
    { destinationName: DESTINATION, jwt: token },
    {
      method: "PUT",
      url: `${BASE_PATH}/${urlPath}(${keyStr})`,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      data: body,
    }
  );
  return res.data;
}

export async function deleteLeave(
  urlPath: string,
  keys: KeyField[],
  jwt?: string,
  sessionId?: string
): Promise<{ success: boolean; status: number }> {
  const token = resolveToken(jwt, sessionId);
  const csrfToken = await fetchCsrfToken(token);
  const keyStr = buildKeyString(keys);
  const res = await executeHttpRequest(
    { destinationName: DESTINATION, jwt: token },
    {
      method: "DELETE",
      url: `${BASE_PATH}/${urlPath}(${keyStr})`,
      headers: { "X-CSRF-Token": csrfToken },
    }
  );
  return { success: true, status: res.status };
}
