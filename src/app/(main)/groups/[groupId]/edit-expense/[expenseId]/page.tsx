"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useServices } from "@/lib/services/service-provider";
import { useCurrencyDisplay } from "@/lib/hooks/use-currency-display";
import { useAuth } from "@/lib/hooks/use-auth";
import { ArrowLeft, Calendar, Loader2, Trash2, StickyNote, Receipt, TrendingDown, TrendingUp } from "lucide-react";
import type { SplitType, SplitEntry, ItemizedSplitData, TransactionType } from "@/lib/types";
import { ItemizedSplitEditor } from "@/components/itemized-split-editor";
import { getCategories, getCategoryLabel } from "@/lib/utils/household-categories";
import { getCurrencySymbol } from "@/lib/utils/currency";
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

export default function EditExpensePage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const expenseId = params.expenseId as string;
  const { expense, settlement, group } = useServices();
  const { userCurrency } = useCurrencyDisplay();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const t = useTranslations("expenses");
  const tc = useTranslations("common");
  const tg = useTranslations("groups");

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(userCurrency);
  const [category, setCategory] = useState("other");
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [paidByUid, setPaidByUid] = useState("");
  const [splitValues, setSplitValues] = useState<Record<string, string>>({});
  const [excludedMembers, setExcludedMembers] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [itemizedData, setItemizedData] = useState<ItemizedSplitData>({ items: [], taxAmount: 0, tipAmount: 0, taxSplitMode: "proportional", tipSplitMode: "proportional" });
  const [transactionType, setTransactionType] = useState<TransactionType>("expense");

  const { data: members } = useQuery({
    queryKey: ["balances", groupId],
    queryFn: () => settlement.getGroupBalances(groupId),
  });

  const { data: existingExpense } = useQuery({
    queryKey: ["expense", groupId, expenseId],
    queryFn: () => expense.getExpenseById(groupId, expenseId),
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

  const canEdit = useMemo(() => {
    if (!existingExpense || !user) return false;
    const member = members?.find((m) => m.uid === user.uid);
    return existingExpense.createdBy === user.uid || member?.role === "admin";
  }, [existingExpense, user, members]);

  useEffect(() => {
    setLoaded(false);
    if (existingExpense) {
      setDescription(existingExpense.description);
      setAmount(String(existingExpense.amount));
      setCurrency(existingExpense.currency);
      setCategory(existingExpense.category);
      setSplitType(existingExpense.splitType);
      setPaidByUid(existingExpense.paidBy);
      setNote(existingExpense.note || "");
      if (existingExpense.splitType !== "equal" && existingExpense.splitType !== "itemized" && existingExpense.splits) {
        const sv: Record<string, string> = {};
        for (const [uid, split] of Object.entries(existingExpense.splits)) {
          sv[uid] = split.shareValue !== undefined ? String(split.shareValue) : String(split.amount);
        }
        setSplitValues(sv);
      }
      if (existingExpense.itemizedData) {
        setItemizedData(existingExpense.itemizedData);
      }
      setTransactionType(existingExpense.transactionType ?? "expense");
      setLoaded(true);
    }
  }, [existingExpense, expenseId]);

  const includedMembers = useMemo(
    () => activeMembers.filter((m) => !excludedMembers.has(m.uid)),
    [activeMembers, excludedMembers]
  );

  const numericAmount = useMemo(() => {
    const cleaned = amount.replace(/[^0-9.+\-*/]/g, "");
    if (!cleaned) return 0;
    try {
      const tokens = cleaned.match(/(\d+\.?\d*|[+\-*/])/g);
      if (!tokens) return parseFloat(cleaned) || 0;
      const result = evaluateMathExpression(tokens);
      return typeof result === "number" && isFinite(result) ? result : 0;
    } catch {
      return parseFloat(cleaned) || 0;
    }
  }, [amount]);

  const splitSummary = useMemo(() => {
    if (splitType === "equal" || !numericAmount) return null;
    let totalEntered = 0;
    for (const m of includedMembers) {
      const val = parseFloat(splitValues[m.uid] || "0") || 0;
      totalEntered += val;
    }
    if (splitType === "percent") return { entered: totalEntered, expected: 100, label: "%" };
    if (splitType === "exact") return { entered: totalEntered, expected: numericAmount, label: currency };
    if (splitType === "shares") return { entered: totalEntered, expected: 0, label: "shares" };
    return null;
  }, [splitType, splitValues, includedMembers, numericAmount, currency]);

  const isSplitValid = useMemo(() => {
    if (splitType === "equal") return includedMembers.length > 0;
    if (splitType === "itemized") {
      if (itemizedData.items.length === 0) return false;
      if (!itemizedData.items.every((i) => i.name.trim() && i.amount > 0 && i.assignedTo.length > 0)) return false;
      const itemTotal = itemizedData.items.reduce((sum, i) => sum + i.amount, 0);
      return Math.abs(itemTotal - numericAmount) < 0.01;
    }
    if (!numericAmount || includedMembers.length === 0) return false;
    if (splitType === "shares") return Object.values(splitValues).some((v) => parseFloat(v) > 0);
    if (!splitSummary) return false;
    return Math.abs(splitSummary.entered - splitSummary.expected) < 0.01;
  }, [splitType, splitValues, includedMembers, numericAmount, splitSummary, itemizedData]);

  const currencySymbol = (curr: string) => getCurrencySymbol(curr) || curr;

  const buildSplits = (): Record<string, SplitEntry> => {
    if (splitType === "equal" || splitType === "itemized") return {};
    const splits: Record<string, SplitEntry> = {};
    for (const m of includedMembers) {
      const val = parseFloat(splitValues[m.uid] || "0") || 0;
      if (splitType === "shares" && val > 0) splits[m.uid] = { amount: 0, shareValue: val };
      else if (splitType === "percent" && val > 0) splits[m.uid] = { amount: 0, shareValue: val };
      else if (splitType === "exact" && val > 0) splits[m.uid] = { amount: val };
    }
    return splits;
  };

  const toggleExclude = (uid: string) => {
    setExcludedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const categories = isHousehold
    ? getCategories(transactionType === "income").map((c) => c.key)
    : ["food", "transport", "shopping", "turf", "accommodation", "other"];
  const splitTypes: SplitType[] = ["equal", "exact", "percent", "shares", "itemized"];

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

  const updateMutation = useMutation({
    mutationFn: () =>
      expense.updateExpense({
        groupId,
        expenseId,
        description,
        amount: numericAmount,
        currency,
        paidBy: paidByUid || activeMembers.find((m) => m.uid === user?.uid)?.uid || activeMembers[0]?.uid || "",
        splitType,
        splits: buildSplits(),
        memberUids: includedMembers.map((m) => m.uid),
        category,
        note,
        itemizedData: splitType === "itemized" ? itemizedData : undefined,
        transactionType: isHousehold ? transactionType : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", groupId] });
      queryClient.invalidateQueries({ queryKey: ["balances", groupId] });
      queryClient.invalidateQueries({ queryKey: ["debts", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groupInfo", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["activities", groupId] });
      router.push(`/groups/${groupId}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => expense.deleteExpense(groupId, expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", groupId] });
      queryClient.invalidateQueries({ queryKey: ["balances", groupId] });
      queryClient.invalidateQueries({ queryKey: ["debts", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groupInfo", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["activities", groupId] });
      router.push(`/groups/${groupId}`);
    },
  });

  if (!existingExpense && loaded) {
    return (
      <div className="mx-auto max-w-2xl p-4 md:p-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('notFound')}</p>
        <button onClick={() => router.push(`/groups/${groupId}`)} className="mt-4 text-sm text-trevio-600 dark:text-trevio-400 hover:underline">
          {tg('details.backToGroup')}
        </button>
      </div>
    );
  }

  if (loaded && !canEdit) {
    return (
      <div className="mx-auto max-w-2xl p-4 md:p-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('editPermissionDenied')}</p>
        <button onClick={() => router.push(`/groups/${groupId}`)} className="mt-4 text-sm text-trevio-600 dark:text-trevio-400 hover:underline">
          {tg('details.backToGroup')}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <button onClick={() => router.back()} className="mb-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" />
        {tc('actions.back')}
      </button>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">{isHousehold ? t('add.editEntryTitle') : t('add.editExpenseTitle')}</h1>

      {!loaded ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-trevio-600" />
        </div>
      ) : (
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
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('add.category')}</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium capitalize transition ${
                    category === cat ? "bg-trevio-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                  }`}
                >
                  {isHousehold ? getCategoryLabel(cat) : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>

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

          {activeMembers.length > 0 && (
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
                  <span className={`text-xs font-semibold ${isSplitValid ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                    {currencySymbol(currency)}{splitSummary.entered.toFixed(2)} / {currencySymbol(currency)}{splitSummary.expected.toFixed(2)} {splitSummary.label}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {includedMembers.map((m) => {
                  const val = splitValues[m.uid] || "";
                  return (
                    <div key={m.uid} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{m.displayName}{m.uid === user?.uid && <span className="ml-1 text-xs text-trevio-600 dark:text-trevio-400">{tc('youLabel')}</span>}</p>
                      </div>
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => setSplitValues({ ...splitValues, [m.uid]: e.target.value.replace(/[^0-9.]/g, "") })}
                        placeholder={splitPlaceholder(splitType)}
                        className="w-20 sm:w-24 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 text-right focus:border-trevio-500 focus:outline-none"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          </>
          )}

          {updateMutation.isError && (
            <p className="text-sm text-red-500 dark:text-red-400">{updateMutation.error instanceof Error ? updateMutation.error.message : t('failedToUpdateExpense')}</p>
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
              onClick={() => updateMutation.mutate()}
              disabled={(!description.trim() && !isHousehold) || !amount || (!isSplitValid && !isHousehold) || updateMutation.isPending}
              className="flex-1 rounded-xl bg-trevio-600 py-4 text-base font-semibold text-white transition hover:bg-trevio-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {tc('actions.saving')}
                </span>
              ) : (
                isHousehold ? t('add.saveEntry') : t('saveChanges')
              )}
            </button>
            <button
              onClick={() => {
                if (confirm(t('delete.confirmWithUndo'))) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
              className="rounded-xl border-2 border-red-200 dark:border-red-800 px-6 py-4 text-base font-semibold text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
