import { callS4 } from "../s4/client";

export async function getBusinessPartner(supplierId: string, jwt?: string) {
  const data = await callS4(supplierId, jwt);

  return {
    supplierId,
    businessPartner: {
      id: data.d.BusinessPartner,
      type: data.d.BusinessPartnerType,
      group: data.d.BusinessPartnerGrouping,
      name: data.d.BusinessPartnerFullName,
      createdBy: data.d.CreatedByUser,
      personNumber: data.d.PersonNumber
    }
  };
}