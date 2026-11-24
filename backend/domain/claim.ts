// The example claim from the brief. Names are fictional.

export interface Debtor {
  id: string;
  name: string;
  phone: string;
}

export interface Claim {
  id: string;
  reference: string;
  creditor: string;
  description: string;
  originalDueDate: string;
  /** Total owed as of the agreement date, incl. interest and fees accrued so far (A12). */
  amountNok: number;
  breakdown: { principalNok: number; interestAndFeesNok: number };
}

export const COLLECTOR_NAME = "Nordvik Collections";

export const demoDebtor: Debtor = {
  id: "deb_001",
  name: "Ola Nordmann",
  phone: "+47 400 00 000",
};

export const demoClaim: Claim = {
  id: "clm_001",
  reference: "NV-2026-10432",
  creditor: "Lysverk Energi AS",
  description: "Unpaid electricity invoice for August 2026",
  originalDueDate: "2026-09-15",
  amountNok: 3000,
  breakdown: { principalNok: 2650, interestAndFeesNok: 350 },
};
