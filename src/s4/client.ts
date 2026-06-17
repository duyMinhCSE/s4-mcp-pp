import { executeHttpRequest } from "@sap-cloud-sdk/http-client";
import { getSession } from "../session";

export async function callS4(supplierId: string, jwt?: string, sessionId?: string) {
  const token = jwt ?? (sessionId ? getSession(sessionId)?.userToken : undefined);
  if (!token) {
    throw new Error("Missing JWT for principal propagation. Provide a valid sessionId or re-authenticate.");
  }

  const response = await executeHttpRequest(
    {
      destinationName: "S4PPRI4",
      jwt: token
    },
    {
      method: "GET",
      url: `/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner('${supplierId}')`,
      headers: {
        Accept: "application/json"
      }
    }
  );

  console.error('response.data', response.data)
  return response.data;


}