import type { SplitEntry, SplitType } from "../types";

type SplitMap = Record<string, SplitEntry>;

export function calculateSplits(
  totalAmount: number,
  splitType: SplitType,
  memberUids: string[],
  splits?: SplitMap
): SplitMap {
  const result: SplitMap = {};

  switch (splitType) {
    case "equal": {
      const perPerson = Math.round((totalAmount / memberUids.length) * 100) / 100;
      let allocated = 0;
      memberUids.forEach((uid, index) => {
        if (index === memberUids.length - 1) {
          result[uid] = { amount: Math.round((totalAmount - allocated) * 100) / 100 };
        } else {
          result[uid] = { amount: perPerson };
          allocated += perPerson;
        }
      });
      break;
    }

    case "exact": {
      if (splits) {
        memberUids.forEach((uid) => {
          result[uid] = { amount: splits[uid]?.amount ?? 0 };
        });
      }
      break;
    }

    case "percent": {
      if (splits) {
        memberUids.forEach((uid) => {
          const percent = splits[uid]?.shareValue ?? 0;
          result[uid] = {
            amount: Math.round((totalAmount * percent / 100) * 100) / 100,
            shareValue: percent,
          };
        });
      }
      break;
    }

    case "shares": {
      if (splits) {
        const totalShares = memberUids.reduce(
          (sum, uid) => sum + (splits[uid]?.shareValue ?? 0),
          0
        );
        if (totalShares > 0) {
          let allocated = 0;
          memberUids.forEach((uid, index) => {
            const shares = splits[uid]?.shareValue ?? 0;
            const amount = Math.round((totalAmount * shares / totalShares) * 100) / 100;
            if (index === memberUids.length - 1) {
              result[uid] = {
                amount: Math.round((totalAmount - allocated) * 100) / 100,
                shareValue: shares,
              };
            } else {
              result[uid] = { amount, shareValue: shares };
              allocated += amount;
            }
          });
        }
      }
      break;
    }
  }

  return result;
}

export function calculateBalances(
  expenses: Array<{ paidBy: string; splits: SplitMap; amount: number; exchangeRateToBase?: number }>,
  settlements: Array<{ fromUid: string; toUid: string; amount: number }>,
  memberUids: string[]
): Map<string, number> {
  const balances = new Map<string, number>();
  memberUids.forEach((uid) => balances.set(uid, 0));

  for (const expense of expenses) {
    const rate = expense.exchangeRateToBase ?? 1;
    const payer = expense.paidBy;
    const amountInBase = expense.amount * rate;
    balances.set(payer, (balances.get(payer) ?? 0) + amountInBase);

    for (const [uid, split] of Object.entries(expense.splits)) {
      const splitInBase = split.amount * rate;
      balances.set(uid, (balances.get(uid) ?? 0) - splitInBase);
    }
  }

  for (const settlement of settlements) {
    balances.set(
      settlement.fromUid,
      (balances.get(settlement.fromUid) ?? 0) + settlement.amount
    );
    balances.set(
      settlement.toUid,
      (balances.get(settlement.toUid) ?? 0) - settlement.amount
    );
  }

  return balances;
}

export function simplifyDebts(balances: Map<string, number>): Array<{ fromUid: string; toUid: string; amount: number }> {
  const debts: Array<{ fromUid: string; toUid: string; amount: number }> = [];

  type Debtor = { uid: string; amount: number };
  type Creditor = { uid: string; amount: number };

  const debtors: Debtor[] = [];
  const creditors: Creditor[] = [];

  balances.forEach((balance, uid) => {
    const rounded = Math.round(balance * 100) / 100;
    if (rounded < -0.01) {
      debtors.push({ uid, amount: -rounded });
    } else if (rounded > 0.01) {
      creditors.push({ uid, amount: rounded });
    }
  });

  debtors.sort((a, b) => a.amount - b.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  let dIndex = 0;
  let cIndex = 0;

  while (dIndex < debtors.length && cIndex < creditors.length) {
    const debtor = debtors[dIndex];
    const creditor = creditors[cIndex];
    const settleAmount = Math.min(debtor.amount, creditor.amount);

    if (settleAmount > 0.01) {
      debts.push({
        fromUid: debtor.uid,
        toUid: creditor.uid,
        amount: Math.round(settleAmount * 100) / 100,
      });
    }

    debtor.amount -= settleAmount;
    creditor.amount -= settleAmount;

    if (debtor.amount < 0.01) dIndex++;
    if (creditor.amount < 0.01) cIndex++;
  }

  return debts;
}

export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function generateBaseUsername(firstName: string, lastName: string): string {
  const first = firstName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const last = lastName.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (first && last) {
    return `${first}.${last}`;
  }
  if (first) {
    return first;
  }
  if (last) {
    return last;
  }
  return "";
}
