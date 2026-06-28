import type { Member, Settlement, SimplifiedDebt, SettlementMethod } from "../../types";

export interface SettlementService {
  addSettlement(params: {
    groupId: string;
    fromUid: string;
    toUid: string;
    amount: number;
    currency: string;
    method: SettlementMethod;
    upiRefId?: string;
  }): Promise<string>;

  getSimplifiedDebts(groupId: string): Promise<SimplifiedDebt[]>;
  getGroupBalances(groupId: string): Promise<Member[]>;
  getSettlementHistory(groupId: string): Promise<Settlement[]>;
}
