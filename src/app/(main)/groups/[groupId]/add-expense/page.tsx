"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useServices } from "@/lib/services/service-provider";
import { useCurrencyDisplay } from "@/lib/hooks/use-currency-display";
import { useAuth } from "@/lib/hooks/use-auth";
import { ArrowLeft, Calendar, Plus, Loader2, StickyNote, Repeat, Receipt, TrendingDown, TrendingUp } from "lucide-react";
import type { SplitType, SplitEntry, Member, RecurringFrequency, ItemizedSplitData, BillItem, TransactionType, Expense } from "@/lib/types";
import { ItemizedSplitEditor } from "@/components/itemized-split-editor";
import { getCategories, getCategoryLabel } from "@/lib/utils/household-categories";
import { getCurrencySymbol } from "@/lib/utils/currency";
import { formatDateToISO } from "@/lib/utils/date";
import { GROUP_INFO_STALE_TIME } from "@/lib/constants/app";

function evaluateMathExpression(tokens: string[]): number {
  const output: (number | string)[] = [];
  const operators: string[] = [];
  const precedence: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };
  for (const token of tokens) {
    if (/^\d+\.?\d*$/.test(token)) {
      output.push(parseFloat(token));
    } else if (token in precedence) {
      while (operators.length && precedence[operators[operators.length - 1]] >= precedence[token]) {
        output.push(operators.pop()!);
      }
      operators.push(token);
    }
  }
  while (operators.length) output.push(operators.pop()!);
  const stack: number[] = [];
  for (const item of output) {
    if (typeof item === "number") {
      stack.push(item);
    } else {
      const b = stack.pop() ?? 0;
      const a = stack.pop() ?? 0;
      switch (item) {
        case "+": stack.push(a + b); break;
        case "-": stack.push(a - b); break;
        case "*": stack.push(a * b); break;
        case "/": stack.push(b !== 0 ? a / b : 0); break;
      }
    }
  }
  return stack[0] ?? 0;
}

export default function AddExpensePage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const { expense, settlement, group } = useServices();
  const { userCurrency } = useCurrencyDisplay();
  const queryClient = useQueryClient();
  const t = useTranslations("expenses");
  const tc = useTranslations("common");

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(userCurrency);
  const [category, setCategory] = useState("other");
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [paidByUid, setPaidByUid] = useState("");
  const [splitValues, setSplitValues] = useState<Record<string, string>>({});
  const [expenseDate, setExpenseDate] = useState(() => formatDateToISO(Date.now()));
  const [excludedMembers, setExcludedMembers] = useState<Set<string>>(new Set());
  const [saveAndAddAnother, setSaveAndAddAnother] = useState(false);
  const [note, setNote] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFreq, setRecurringFreq] = useState<RecurringFrequency>("monthly");
  const [itemizedData, setItemizedData] = useState<ItemizedSplitData>({ items: [], taxAmount: 0, tipAmount: 0, taxSplitMode: "proportional", tipSplitMode: "proportional" });
  const [transactionType, setTransactionType] = useState<TransactionType>("expense");
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const { data: members } = useQuery({
    queryKey: ["balances", groupId],
    queryFn: () => settlement.getGroupBalances(groupId),
  });

  const { data: groupInfo } = useQuery({
    queryKey: ["groupInfo", groupId],
    queryFn: () => group.getGroupInfo(groupId),
    staleTime: GROUP_INFO_STALE_TIME,
  });

  const isHousehold = groupInfo?.template === "household";

  const activeMembers = useMemo(
    () => members?.filter((m) => m.status === "active") ?? [],
    [members]
  );
  const includedMembers = useMemo(
    () => activeMembers.filter((m) => !excludedMembers.has(m.uid)),
    [activeMembers, excludedMembers]
  );
  const numericAmount = useMemo(() => {
    const cleaned = amount.replace(/[^0-9.+\-*/]/g, "");
    if (!cleaned) return 0;
    try {
      // Safe expression evaluator - only allows numbers and + - * / operators
      const tokens = cleaned.match(/(\d+\.?\d*|[+\-*/])/g);
      if (!tokens) return parseFloat(cleaned) || 0;
      // Evaluate using shunting-yard approach (no Function() for security)
      const result = evaluateMathExpression(tokens);
      return typeof result === "number" && isFinite(result) ? result : 0;
    } catch {
      return parseFloat(cleaned) || 0;
    }
  }, [amount]);
  const equalPerPerson = useMemo(() => {
    if (splitType !== "equal" || numericAmount <= 0 || includedMembers.length === 0) return 0;
    return numericAmount / includedMembers.length;
  }, [splitType, numericAmount, includedMembers]);

  const splitSummary = useMemo(() => {
    if (splitType === "equal" || !numericAmount) return null;
    let totalEntered = 0;
    for (const m of includedMembers) {
      const val = parseFloat(splitValues[m.uid] || "0") || 0;
      totalEntered += val;
    }
    if (splitType === "percent") {
      return { entered: totalEntered, expected: 100, label: "%" };
    }
    if (splitType === "exact") {
      return { entered: totalEntered, expected: numericAmount, label: currency };
    }
    if (splitType === "shares") {
      return { entered: totalEntered, expected: 0, label: "shares" };
    }
    return null;
  }, [splitType, splitValues, includedMembers, numericAmount, currency]);

  const currencySymbol = (curr: string) => getCurrencySymbol(curr) || curr;

  const isSplitValid = useMemo(() => {
    if (splitType === "equal") return includedMembers.length > 0;
    if (splitType === "itemized") {
      if (itemizedData.items.length === 0) return false;
      if (!itemizedData.items.every((i) => i.name.trim() && i.amount > 0 && i.assignedTo.length > 0)) return false;
      const itemTotal = itemizedData.items.reduce((sum, i) => sum + i.amount, 0);
      return Math.abs(itemTotal - numericAmount) < 0.01;
    }
    if (!numericAmount || includedMembers.length === 0) return false;
    if (splitType === "shares") {
      return Object.values(splitValues).some((v) => parseFloat(v) > 0);
    }
    if (!splitSummary) return false;
    return Math.abs(splitSummary.entered - splitSummary.expected) < 0.01;
  }, [splitType, splitValues, includedMembers, numericAmount, splitSummary, itemizedData]);

  const buildSplits = (): Record<string, SplitEntry> => {
    if (splitType === "equal" || splitType === "itemized") return {};

    const splits: Record<string, SplitEntry> = {};
    for (const m of includedMembers) {
      const val = parseFloat(splitValues[m.uid] || "0") || 0;
      if (splitType === "shares" && val > 0) {
        splits[m.uid] = { amount: 0, shareValue: val };
      } else if (splitType === "percent" && val > 0) {
        splits[m.uid] = { amount: 0, shareValue: val };
      } else if (splitType === "exact" && val > 0) {
        splits[m.uid] = { amount: val };
      }
    }
    return splits;
  };

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setCategory("other");
    setSplitType("equal");
    setSplitValues({});
    setExcludedMembers(new Set());
    setExpenseDate(formatDateToISO(Date.now()));
    setNote("");
    setIsRecurring(false);
    setItemizedData({ items: [], taxAmount: 0, tipAmount: 0, taxSplitMode: "proportional", tipSplitMode: "proportional" });
    setTransactionType("expense");
  };

  const addMutation = useMutation({
    mutationFn: () => {
      const dateMs = new Date(expenseDate).getTime();
      if (isNaN(dateMs)) {
        throw new Error(t('add.validDateRequired'));
      }
      return expense.addExpense({
        groupId,
        description,
        amount: numericAmount,
        currency,
        paidBy: paidByUid || activeMembers.find((m) => m.uid === user?.uid)?.uid || activeMembers[0]?.uid || "",
        splitType,
        splits: buildSplits(),
        memberUids: includedMembers.map((m) => m.uid),
        category,
        date: dateMs,
        note: note.trim() || undefined,
        recurring: isRecurring ? { frequency: recurringFreq } : undefined,
        itemizedData: splitType === "itemized" ? itemizedData : undefined,
        transactionType: isHousehold ? transactionType : undefined,
      });
    },
    onMutate: () => {
      const expenseKey = ["expenses", groupId];
      // Snapshot the current expenses so we can roll back on error
      const previousExpenses = queryClient.getQueryData<Expense[]>(expenseKey);
      if (previousExpenses) {
        const tempExpense: Expense = {
          expenseId: `temp-${Date.now()}`,
          description,
          amount: numericAmount,
          currency,
          exchangeRateToGroupCurrency: 1,
          amountInGroupCurrency: numericAmount,
          paidBy: paidByUid || activeMembers.find((m) => m.uid === user?.uid)?.uid || activeMembers[0]?.uid || "",
          splitType,
          splits: buildSplits(),
          category,
          createdBy: user?.uid ?? "",
          date: new Date(expenseDate).getTime(),
          note: note.trim() || undefined,
          recurring: isRecurring ? { frequency: recurringFreq } : undefined,
          itemizedData: splitType === "itemized" ? itemizedData : undefined,
          transactionType: isHousehold ? transactionType : undefined,
        };
        queryClient.setQueryData<Expense[]>(expenseKey, [tempExpense, ...previousExpenses]);
      }
      return { previousExpenses };
    },
    onError: (_err, _vars, context) => {
      // Roll back the optimistic expense if the mutation failed
      if (context?.previousExpenses) {
        queryClient.setQueryData(["expenses", groupId], context.previousExpenses);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", groupId] });
      queryClient.invalidateQueries({ queryKey: ["balances", groupId] });
      queryClient.invalidateQueries({ queryKey: ["debts", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groupInfo", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["activities", groupId] });
      if (saveAndAddAnother) {
        resetForm();
        setSaveAndAddAnother(false);
      } else {
        router.push(`/groups/${groupId}`);
      }
    },
  });

  const handleSave = () => {
    const dateMs = new Date(expenseDate).getTime();
    if (isNaN(dateMs)) {
      setError(t('add.validDateRequired'));
      return;
    }
    setError(null);
    addMutation.mutate();
  };

  const categories = isHousehold
    ? getCategories(transactionType === "income").map((c) => c.key)
    : ["food", "transport", "shopping", "turf", "accommodation", "other"];
  const splitTypes: SplitType[] = ["equal", "exact", "percent", "shares", "itemized"];

  const toggleExclude = (uid: string) => {
    setExcludedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const splitLabel = (st: SplitType) => {
    switch (st) {
      case "equal": return t('add.equal');
      case "exact": return t('add.exactAmount');
      case "percent": return t('add.percentage');
      case "shares": return t('add.shares');
      case "itemized": return t('add.items');
    }
  };

  const splitPlaceholder = (st: SplitType) => {
    switch (st) {
      case "exact": return t('add.splitPlaceholderExact');
      case "percent": return t('add.splitPlaceholderPercent');
      case "shares": return t('add.splitPlaceholderShares');
      case "itemized": return "";
      default: return "";
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <button onClick={() => router.back()} className="mb-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" />
        {tc('actions.back')}
      </button>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">{isHousehold ? t('add.entryTitle') : t('add.expenseTitle')}</h1>

      <div className="space-y-5">
        <div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">
              {currencySymbol(currency)}
            </span>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.+\-*/]/g, ""))}
              placeholder={t('add.amountPlaceholder')}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-4 pl-12 text-3xl font-bold text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
            />
          </div>
          {numericAmount > 0 && /[+\-*/]/.test(amount) && (
            <p className="mt-1 text-xs text-trevio-600 font-medium">
              = {currencySymbol(currency)}{numericAmount.toFixed(2)}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-slate-400 dark:text-slate-500">{t('add.quickCalc')}</span>
            {[
              { label: "+", op: "+" },
              { label: "−", op: "-" },
              { label: "×", op: "*" },
              { label: "÷", op: "/" },
            ].map((btn) => (
              <button
                key={btn.op}
                onClick={() => setAmount((prev) => prev + btn.op)}
                className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-600 dark:text-slate-300 transition hover:bg-trevio-50 dark:hover:bg-trevio-900/30 hover:border-trevio-300 dark:hover:border-trevio-700 hover:text-trevio-600 dark:hover:text-trevio-400"
              >
                {btn.label}
              </button>
            ))}
            {amount && (
              <button
                onClick={() => setAmount("")}
                className="ml-auto rounded-lg px-2 py-1 text-xs font-medium text-slate-400 dark:text-slate-500 transition hover:text-slate-600 dark:hover:text-slate-300"
              >
                {t('add.clear')}
              </button>
            )}
          </div>
        </div>

        {isHousehold && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('add.transactionType')}</label>
            <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button
                onClick={() => {
                  setTransactionType("expense");
                  setCategory(getCategories(false)[0]?.key ?? "other");
                }}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition ${
                  transactionType === "expense"
                    ? "bg-red-500 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                <TrendingDown className="h-4 w-4" />
                {t('add.spent')}
              </button>
              <button
                onClick={() => {
                  setTransactionType("income");
                  setCategory(getCategories(true)[0]?.key ?? "other_income");
                }}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition ${
                  transactionType === "income"
                    ? "bg-green-500 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                {t('add.received')}
              </button>
            </div>
          </div>
        )}

        {/* Paid By / Received By — for household groups, shown right below
            the Spent/Received toggle. Label changes based on selection. */}
        {isHousehold && members !== undefined && activeMembers.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {transactionType === "income" ? t('add.receivedBy') : t('add.paidBy')}
            </label>
            <div className="flex flex-wrap gap-2">
              {activeMembers.map((m) => (
                <button
                  key={m.uid}
                  onClick={() => setPaidByUid(m.uid)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                    (paidByUid || activeMembers.find((m) => m.uid === user?.uid)?.uid || activeMembers[0]?.uid) === m.uid
                      ? "bg-trevio-600 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                  }`}
                >
                  {m.displayName.split(" ")[0]}
                  {m.uid === user?.uid && <span className="ml-1 text-xs opacity-70">{tc('youLabel')}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('add.description')}</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            placeholder={isHousehold ? t('add.descriptionPlaceholderHousehold') : t('add.descriptionPlaceholderExpense')}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('add.date')}</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              max={formatDateToISO(Date.now())}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 pl-10 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('add.category')}</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                  category === cat ? "bg-trevio-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                {isHousehold ? getCategoryLabel(cat) : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Paid By for non-household groups (shown after category) */}
        {!isHousehold && (
          members === undefined ? (
            <div className="space-y-2">
              <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
              <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-9 w-20 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
            </div>
          ) : activeMembers.length > 0 ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('add.paidBy')}</label>
              <div className="flex flex-wrap gap-2">
                {activeMembers.map((m) => (
                  <button
                    key={m.uid}
                    onClick={() => setPaidByUid(m.uid)}
                    className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                      (paidByUid || activeMembers.find((m) => m.uid === user?.uid)?.uid || activeMembers[0]?.uid) === m.uid
                        ? "bg-trevio-600 text-white"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                    }`}
                  >
                    {m.displayName.split(" ")[0]}
                    {m.uid === user?.uid && <span className="ml-1 text-xs opacity-70">{tc('youLabel')}</span>}
                  </button>
                ))}
              </div>
            </div>
          ) : null
        )}

        {!isHousehold && (
        <>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('add.splitMethod')}</label>
          <div className="flex flex-wrap gap-2">
            {splitTypes.map((st) => (
              <button
                key={st}
                onClick={() => setSplitType(st)}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                  splitType === st ? "bg-trevio-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                {splitLabel(st)}
              </button>
            ))}
          </div>
        </div>

        {splitType === "equal" && activeMembers.length > 0 && numericAmount > 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('add.perPerson', { symbol: currencySymbol(currency), amount: equalPerPerson.toFixed(2) })}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">{t('add.membersIncluded', { included: includedMembers.length, total: activeMembers.length })}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeMembers.map((m) => {
                const excluded = excludedMembers.has(m.uid);
                return (
                  <button
                    key={m.uid}
                    onClick={() => toggleExclude(m.uid)}
                    className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                      excluded
                        ? "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 line-through"
                        : "bg-trevio-50 dark:bg-trevio-900/30 text-trevio-700 dark:text-trevio-300 border border-trevio-200 dark:border-trevio-700"
                    }`}
                  >
                    {m.displayName.split(" ")[0]}{m.uid === user?.uid && <span className="ml-1 text-xs opacity-70">{tc('youLabel')}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {splitType === "itemized" && activeMembers.length > 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-trevio-600 dark:text-trevio-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('add.splitByItems')}
              </span>
            </div>
            <ItemizedSplitEditor
              members={activeMembers}
              currency={currency}
              itemizedData={itemizedData}
              onChange={setItemizedData}
            />
          </div>
        )}

        {splitType !== "equal" && splitType !== "itemized" && activeMembers.length > 0 && numericAmount > 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {splitType === "exact" && t('add.enterExactAmount')}
                {splitType === "percent" && t('add.enterPercentage')}
                {splitType === "shares" && t('add.enterShares')}
              </span>
              {splitSummary && splitType !== "shares" && (
                <span className={`text-xs font-semibold ${
                  isSplitValid ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"
                }`}>
                  {currencySymbol(currency)}{splitSummary.entered.toFixed(2)} / {currencySymbol(currency)}{splitSummary.expected.toFixed(2)} {splitSummary.label}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {includedMembers.map((m) => {
                const val = splitValues[m.uid] || "";
                let displayAmount = "";
                if (splitType === "percent" && val && numericAmount) {
                  displayAmount = `= ${currencySymbol(currency)}${((parseFloat(val) / 100) * numericAmount).toFixed(2)}`;
                } else if (splitType === "shares" && val) {
                  const totalShares = Object.values(splitValues).reduce((s, v) => s + (parseFloat(v) || 0), 0);
                  if (totalShares > 0 && numericAmount) {
                    displayAmount = `= ${currencySymbol(currency)}${((parseFloat(val) / totalShares) * numericAmount).toFixed(2)}`;
                  }
                }
                return (
                  <div key={m.uid} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{m.displayName}{m.uid === user?.uid && <span className="ml-1 text-xs text-trevio-600 dark:text-trevio-400">{tc('youLabel')}</span>}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {displayAmount && (
                        <span className="text-xs text-slate-400 dark:text-slate-500">{displayAmount}</span>
                      )}
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => setSplitValues({ ...splitValues, [m.uid]: e.target.value.replace(/[^0-9.]/g, "") })}
                        placeholder={splitPlaceholder(splitType)}
                        className="w-20 sm:w-24 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 text-right focus:border-trevio-500 focus:outline-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {includedMembers.length < activeMembers.length && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">{t('add.excludedMembers')}</p>
                <div className="flex flex-wrap gap-2">
                  {activeMembers.filter((m) => excludedMembers.has(m.uid)).map((m) => (
                    <button
                      key={m.uid}
                      onClick={() => toggleExclude(m.uid)}
                      className="rounded-xl px-3 py-1.5 text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                    >
                      {m.displayName.split(" ")[0]}{m.uid === user?.uid && <span className="ml-1 text-xs opacity-70">{tc('youLabel')}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {splitType === "shares" && (
              <p className="text-xs text-slate-400 dark:text-slate-500">{t('add.proportionalHint')}</p>
            )}
          </div>
        )}
        </>)}

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            <StickyNote className="h-4 w-4 text-slate-400" />
            {t('add.noteLabel')}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder={t('add.notePlaceholder')}
            rows={2}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none resize-none"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-trevio-600 focus:ring-trevio-500"
            />
            <Repeat className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('add.recurringLabel')}</span>
          </label>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('add.recurringDesc')}</p>
          {isRecurring && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setRecurringFreq("weekly")}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                  recurringFreq === "weekly" ? "bg-trevio-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                {t('add.weekly')}
              </button>
              <button
                onClick={() => setRecurringFreq("monthly")}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                  recurringFreq === "monthly" ? "bg-trevio-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                {t('add.monthly')}
              </button>
            </div>
          )}
        </div>

        {(error || addMutation.isError) && (
          <p className="text-sm text-red-500 dark:text-red-400">{error ?? (addMutation.error instanceof Error ? addMutation.error.message : t('failedToAddExpense'))}</p>
        )}

        {!isSplitValid && numericAmount > 0 && splitType !== "equal" && splitType !== "itemized" && includedMembers.length > 0 && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            {splitType === "percent" && t('add.totalMustBe100', { current: splitSummary?.entered ?? 0 })}
            {splitType === "exact" && t('add.totalMustMatch', { symbol: currencySymbol(currency), amount: numericAmount.toFixed(2), current: (splitSummary?.entered ?? 0).toFixed(2) })}
            {splitType === "shares" && t('add.enterShareValue')}
          </p>
        )}

        {splitType === "itemized" && numericAmount > 0 && itemizedData.items.length > 0 && itemizedData.items.every((i) => i.name.trim() && i.amount > 0 && i.assignedTo.length > 0) && (() => {
          const itemTotal = itemizedData.items.reduce((sum, i) => sum + i.amount, 0);
          return Math.abs(itemTotal - numericAmount) >= 0.01 ? (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {t('add.itemizedTotalMustMatch', { symbol: currencySymbol(currency), amount: numericAmount.toFixed(2) })}
            </p>
          ) : null;
        })()}

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={(!description.trim() && !isHousehold) || !amount || (!isSplitValid && !isHousehold) || addMutation.isPending}
            className="flex-1 rounded-xl bg-trevio-600 py-4 text-base font-semibold text-white transition hover:bg-trevio-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {addMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                {tc('actions.saving')}
              </span>
            ) : (
              isHousehold ? t('add.saveEntry') : t('add.saveExpense')
            )}
          </button>
          <button
            onClick={() => {
              setSaveAndAddAnother(true);
              handleSave();
            }}
            disabled={(!description.trim() && !isHousehold) || !amount || (!isSplitValid && !isHousehold) || addMutation.isPending}
            className="flex-1 rounded-xl border-2 border-trevio-600 py-4 text-base font-semibold text-trevio-600 dark:text-trevio-400 transition hover:bg-trevio-50 dark:hover:bg-trevio-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="flex items-center justify-center gap-2">
              <Plus className="h-5 w-5" />
              {t('add.saveAndAddAnother')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
