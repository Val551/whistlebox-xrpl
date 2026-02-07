export const campaignId = "cityhall-001";

export const campaign = {
  id: campaignId,
  title: "City Hall Contracts Investigation",
  description: "Funding an investigative series into city hall procurement practices.",
  journalistAddress: "rJOURNALISTADDRESS...",
  verifierAddress: "rVERIFIERADDRESS...",
  totalRaisedXrp: 150.5,
  totalLockedXrp: 120.5,
  totalReleasedXrp: 30.0,
  escrowCount: 3,
  status: "active"
};

export const escrows = [
  {
    id: "escrow-0001",
    campaignId,
    donationId: "donation-0001",
    amountXrp: 50.0,
    currency: "XRP",
    escrowCreateTx: "A1B2C3D4...",
    escrowFinishTx: null,
    ownerAddress: "rCUSTODYADDRESS...",
    destinationAddress: "rJOURNALISTADDRESS...",
    condition: null,
    fulfillment: null,
    finishAfter: "2026-02-07T00:00:00.000Z",
    status: "locked"
  },
  {
    id: "escrow-0002",
    campaignId,
    donationId: "donation-0002",
    amountXrp: 70.5,
    currency: "XRP",
    escrowCreateTx: "E5F6G7H8...",
    escrowFinishTx: "I9J0K1L2...",
    ownerAddress: "rCUSTODYADDRESS...",
    destinationAddress: "rJOURNALISTADDRESS...",
    condition: null,
    fulfillment: null,
    finishAfter: "2026-02-06T00:00:00.000Z",
    status: "released"
  }
];

export const donations = [
  {
    id: "donation-0001",
    campaignId,
    amountXrp: 50.0,
    donorTag: null,
    paymentTx: "9Z8Y7X6W...",
    createdAt: "2026-02-07T00:00:00.000Z",
    escrowId: "escrow-0001",
    status: "escrowed"
  },
  {
    id: "donation-0002",
    campaignId,
    amountXrp: 70.5,
    donorTag: null,
    paymentTx: "7V6U5T4S...",
    createdAt: "2026-02-06T00:00:00.000Z",
    escrowId: "escrow-0002",
    status: "escrowed"
  }
];
