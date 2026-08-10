"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, Receipt, Users, Copy } from "lucide-react";
import type { BillItem, ItemizedSplitData, Member } from "@/lib/types";
import { getCurrencySymbol } from "@/lib/utils/currency";

interface ItemizedSplitEditorProps {
  members: Member[];
  currency: string;
  itemizedData: ItemizedSplitData;
  onChange: (data: ItemizedSplitData) => void;
}

export function ItemizedSplitEditor({
  members,
  currency,
  itemizedData,
  onChange,
}: ItemizedSplitEditorProps) {
  const currencySymbol = (curr: string) => getCurrencySymbol(curr) || curr;

  const activeMembers = useMemo(
    () => members.filter((m) => m.status === "active"),
    [members]
  );

  const addItem = () => {
    const newItem: BillItem = {
      itemId: `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: "",
      amount: 0,
      assignedTo: [],
    };
    onChange({
      ...itemizedData,
      items: [...itemizedData.items, newItem],
    });
  };

  const removeItem = (itemId: string) => {
    onChange({
      ...itemizedData,
      items: itemizedData.items.filter((i) => i.itemId !== itemId),
    });
  };

  const updateItem = (itemId: string, field: keyof BillItem, value: string | number | string[]) => {
    onChange({
      ...itemizedData,
      items: itemizedData.items.map((i) =>
        i.itemId === itemId ? { ...i, [field]: value } : i
      ),
    });
  };

  const toggleMemberAssignment = (itemId: string, uid: string) => {
    const item = itemizedData.items.find((i) => i.itemId === itemId);
    if (!item) return;
    const isAssigned = item.assignedTo.includes(uid);
    const newAssigned = isAssigned
      ? item.assignedTo.filter((u) => u !== uid)
      : [...item.assignedTo, uid];
    updateItem(itemId, "assignedTo", newAssigned);
  };

  const assignAllToItem = (itemId: string) => {
    updateItem(itemId, "assignedTo", activeMembers.map((m) => m.uid));
  };

  const duplicateItem = (itemId: string) => {
    const item = itemizedData.items.find((i) => i.itemId === itemId);
    if (!item) return;
    const newItem: BillItem = {
      ...item,
      itemId: `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: `${item.name} (copy)`,
    };
    onChange({
      ...itemizedData,
      items: [...itemizedData.items, newItem],
    });
  };

  const itemsTotal = useMemo(
    () => itemizedData.items.reduce((sum, i) => sum + (i.assignedTo.length > 0 ? i.amount : 0), 0),
    [itemizedData.items]
  );

  const memberTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    activeMembers.forEach((m) => { totals[m.uid] = 0; });

    for (const item of itemizedData.items) {
      if (!item.assignedTo || item.assignedTo.length === 0) continue;
      const perPerson = item.amount / item.assignedTo.length;
      for (const uid of item.assignedTo) {
        if (totals[uid] !== undefined) {
          totals[uid] += perPerson;
        }
      }
    }

    const taxAmt = itemizedData.taxAmount ?? 0;
    const tipAmt = itemizedData.tipAmount ?? 0;

    if (taxAmt > 0 && itemsTotal > 0) {
      const mode = itemizedData.taxSplitMode ?? "proportional";
      const membersWithItems = activeMembers.filter((m) => totals[m.uid] > 0);
      if (mode === "proportional") {
        for (const m of activeMembers) {
          totals[m.uid] += (totals[m.uid] / itemsTotal) * taxAmt;
        }
      } else {
        const perPerson = taxAmt / Math.max(membersWithItems.length, 1);
        for (const m of membersWithItems) {
          totals[m.uid] += perPerson;
        }
      }
    }

    if (tipAmt > 0 && itemsTotal > 0) {
      const mode = itemizedData.tipSplitMode ?? "proportional";
      const membersWithItems = activeMembers.filter((m) => totals[m.uid] > 0);
      const baseForProp = itemsTotal + taxAmt;
      if (mode === "proportional" && baseForProp > 0) {
        for (const m of activeMembers) {
          totals[m.uid] += (totals[m.uid] / baseForProp) * tipAmt;
        }
      } else {
        const perPerson = tipAmt / Math.max(membersWithItems.length, 1);
        for (const m of membersWithItems) {
          totals[m.uid] += perPerson;
        }
      }
    }

    return totals;
  }, [itemizedData, activeMembers, itemsTotal]);

  const grandTotal = itemsTotal + (itemizedData.taxAmount ?? 0) + (itemizedData.tipAmount ?? 0);

  const isValid = useMemo(() => {
    if (itemizedData.items.length === 0) return false;
    return itemizedData.items.every((i) => i.name.trim() && i.amount > 0 && i.assignedTo.length > 0);
  }, [itemizedData.items]);

  const firstName = (name: string) => name.split(" ")[0] || name;

  return (
    <div className="space-y-4">
      {/* Items List */}
      <div className="space-y-3">
        {itemizedData.items.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-8 text-center">
            <Receipt className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm text-slate-400 dark:text-slate-500">
              No items added yet. Tap &ldquo;Add Item&rdquo; to start splitting your bill item by item.
            </p>
          </div>
        )}

        {itemizedData.items.map((item, index) => (
          <div
            key={item.itemId}
            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3"
          >
            {/* Item Header */}
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-trevio-100 dark:bg-trevio-900/40 text-xs font-bold text-trevio-700 dark:text-trevio-300">
                {index + 1}
              </span>
              <input
                type="text"
                value={item.name}
                onChange={(e) => updateItem(item.itemId, "name", e.target.value)}
                placeholder={`Item ${index + 1} name`}
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
              />
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  {currencySymbol(currency)}
                </span>
                <input
                  type="text"
                  value={item.amount || ""}
                  onChange={(e) => updateItem(item.itemId, "amount", parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0)}
                  placeholder="0.00"
                  className="w-24 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-7 pr-2 py-2 text-sm text-slate-900 dark:text-slate-100 text-right focus:border-trevio-500 focus:outline-none"
                />
              </div>
              <button
                onClick={() => duplicateItem(item.itemId)}
                className="rounded-lg p-2 text-slate-400 hover:text-trevio-600 hover:bg-trevio-50 dark:hover:bg-trevio-900/30 transition"
                title="Duplicate item"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                onClick={() => removeItem(item.itemId)}
                className="rounded-lg p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
                title="Remove item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Member Assignment */}
            <div className="flex flex-wrap items-center gap-1.5 pl-8">
              <span className="text-xs text-slate-400 dark:text-slate-500 mr-1 flex items-center gap-1">
                <Users className="h-3 w-3" />
                Split with:
              </span>
              <button
                onClick={() => assignAllToItem(item.itemId)}
                className="rounded-md bg-slate-100 dark:bg-slate-700 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-trevio-50 dark:hover:bg-trevio-900/30 hover:text-trevio-600 dark:hover:text-trevio-400 transition"
              >
                All
              </button>
              {activeMembers.map((m) => {
                const isAssigned = item.assignedTo.includes(m.uid);
                return (
                  <button
                    key={m.uid}
                    onClick={() => toggleMemberAssignment(item.itemId, m.uid)}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                      isAssigned
                        ? "bg-trevio-100 dark:bg-trevio-900/40 text-trevio-700 dark:text-trevio-300 border border-trevio-200 dark:border-trevio-700"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {firstName(m.displayName)}
                  </button>
                );
              })}
            </div>

            {/* Per-person for this item */}
            {item.assignedTo.length > 0 && item.amount > 0 && (
              <p className="pl-8 text-xs text-slate-400 dark:text-slate-500">
                {currencySymbol(currency)}{(item.amount / item.assignedTo.length).toFixed(2)} each
                {item.assignedTo.length > 1 && ` × ${item.assignedTo.length} people`}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Add Item Button */}
      <button
        onClick={addItem}
        className="w-full rounded-2xl border-2 border-dashed border-trevio-300 dark:border-trevio-700 py-3 text-sm font-medium text-trevio-600 dark:text-trevio-400 transition hover:bg-trevio-50 dark:hover:bg-trevio-900/20"
      >
        <Plus className="inline h-4 w-4 mr-1" />
        Add Item
      </button>

      {/* Tax & Tip */}
      {itemizedData.items.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tax</label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  {currencySymbol(currency)}
                </span>
                <input
                  type="text"
                  value={itemizedData.taxAmount || ""}
                  onChange={(e) => onChange({
                    ...itemizedData,
                    taxAmount: parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0,
                  })}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-7 pr-2 py-2 text-sm text-slate-900 dark:text-slate-100 text-right focus:border-trevio-500 focus:outline-none"
                />
              </div>
              <div className="mt-1.5 flex gap-1">
                <button
                  onClick={() => onChange({ ...itemizedData, taxSplitMode: "proportional" })}
                  className={`rounded-md px-2 py-0.5 text-xs font-medium transition ${
                    (itemizedData.taxSplitMode ?? "proportional") === "proportional"
                      ? "bg-trevio-600 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  Proportional
                </button>
                <button
                  onClick={() => onChange({ ...itemizedData, taxSplitMode: "equal" })}
                  className={`rounded-md px-2 py-0.5 text-xs font-medium transition ${
                    itemizedData.taxSplitMode === "equal"
                      ? "bg-trevio-600 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  Equal
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tip</label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  {currencySymbol(currency)}
                </span>
                <input
                  type="text"
                  value={itemizedData.tipAmount || ""}
                  onChange={(e) => onChange({
                    ...itemizedData,
                    tipAmount: parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0,
                  })}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-7 pr-2 py-2 text-sm text-slate-900 dark:text-slate-100 text-right focus:border-trevio-500 focus:outline-none"
                />
              </div>
              <div className="mt-1.5 flex gap-1">
                <button
                  onClick={() => onChange({ ...itemizedData, tipSplitMode: "proportional" })}
                  className={`rounded-md px-2 py-0.5 text-xs font-medium transition ${
                    (itemizedData.tipSplitMode ?? "proportional") === "proportional"
                      ? "bg-trevio-600 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  Proportional
                </button>
                <button
                  onClick={() => onChange({ ...itemizedData, tipSplitMode: "equal" })}
                  className={`rounded-md px-2 py-0.5 text-xs font-medium transition ${
                    itemizedData.tipSplitMode === "equal"
                      ? "bg-trevio-600 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  Equal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {itemizedData.items.length > 0 && (
        <div className="rounded-2xl border border-trevio-200 dark:border-trevio-700 bg-trevio-50 dark:bg-trevio-900/20 p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Items total</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {currencySymbol(currency)}{itemsTotal.toFixed(2)}
            </span>
          </div>
          {(itemizedData.taxAmount ?? 0) > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Tax</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {currencySymbol(currency)}{(itemizedData.taxAmount ?? 0).toFixed(2)}
              </span>
            </div>
          )}
          {(itemizedData.tipAmount ?? 0) > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Tip</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {currencySymbol(currency)}{(itemizedData.tipAmount ?? 0).toFixed(2)}
              </span>
            </div>
          )}
          <div className="border-t border-trevio-200 dark:border-trevio-700 pt-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Grand total</span>
            <span className="text-lg font-bold text-trevio-700 dark:text-trevio-300">
              {currencySymbol(currency)}{grandTotal.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Per-member breakdown */}
      {itemizedData.items.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Per person breakdown</p>
          <div className="space-y-2">
            {activeMembers.map((m) => (
              <div key={m.uid} className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {m.displayName}
                </span>
                <span className={`text-sm font-medium ${
                  memberTotals[m.uid] > 0
                    ? "text-slate-900 dark:text-slate-100"
                    : "text-slate-400 dark:text-slate-600"
                }`}>
                  {currencySymbol(currency)}{(memberTotals[m.uid] ?? 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isValid && itemizedData.items.length > 0 && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Each item needs a name, amount, and at least one person assigned.
        </p>
      )}
    </div>
  );
}
