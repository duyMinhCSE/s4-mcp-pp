import { executeHttpRequest } from "@sap-cloud-sdk/http-client";

/**
 * Calls S/4 using Destination Service + Principal Propagation
 */
export async function callS4(supplierId: string, jwt?: string) {
  if (!jwt) {
    throw new Error("Missing JWT for principal propagation");
  }

  console.error('executeHttpRequest started', supplierId)

  const response = await executeHttpRequest(
    {
      destinationName: "Robin_S4HANA_HE4_SCC_ODATA"
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