import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase";
import type { SettlementService } from "../interfaces/settlement-service";
import type { Member, Settlement, SimplifiedDebt, SettlementMethod } from "../../types";

export class FirebaseSettlementService implements SettlementService {
  async addSettlement(params: {
    groupId: string;
    fromUid: string;
    toUid: string;
    amount: number;
    currency: string;
    method: SettlementMethod;
    upiRefId?: string;
  }): Promise<string> {
    const fn = httpsCallable(functions, "addSettlement");
    const result = await fn(params);
    const data = result.data as { settlementId: string };
    return data.settlementId;
  }

  async getSimplifiedDebts(groupId: string): Promise<SimplifiedDebt[]> {
    const fn = httpsCallable(functions, "getSimplifiedDebts");
    const result = await fn({ groupId });
    const data = result.data as { debts: SimplifiedDebt[] };
    return data.debts || [];
  }

  async getGroupBalances(groupId: string): Promise<Member[]> {
    const fn = httpsCallable(functions, "getGroupBalances");
    const result = await fn({ groupId });
    const data = result.data as { members: Member[] };
    return data.members || [];
  }

  async getSettlementHistory(groupId: string): Promise<Settlement[]> {
    const fn = httpsCallable(functions, "getSettlementHistory");
    const result = await fn({ groupId });
    const data = result.data as { settlements: Settlement[] };
    return data.settlements || [];
  }
}
