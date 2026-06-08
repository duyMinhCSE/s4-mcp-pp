import { callS4 } from "../s4/client";

export async function getBusinessPartner(supplierId: string, jwt?: string) {
  const data = await callS4(supplierId, jwt);

  return {
    supplierId,
    businessPartner: {
      id: data.BusinessPartner,
      type: data.BusinessPartnerType,
      category: data.BusinessPartnerCategory,
      createdOn: data.CreationDate,
      changedOn: data.LastChangeDateTime
    }
  };
}