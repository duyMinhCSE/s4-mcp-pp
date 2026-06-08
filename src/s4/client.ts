import { executeHttpRequest } from "@sap-cloud-sdk/http-client";

/**
 * Calls S/4 using Destination Service + Principal Propagation
 */
export async function callS4(supplierId: string, jwt?: string) {
  if (!jwt) {
    throw new Error("Missing JWT for principal propagation");
  }

  const response = await executeHttpRequest(
    {
      destinationName: "S4_ONPREM_PP",
      jwt 
    },
    {
      method: "GET",
      url: `/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner('${encodeURIComponent(supplierId)}')`,
      headers: {
        Accept: "application/json"
      }
    }
  );

  return response.data;
}