"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServices } from "@/lib/services/service-provider";
import { useCurrencyDisplay } from "@/lib/hooks/use-currency-display";
import { Avatar } from "@/components/avatar";
import type { TripItineraryItem, TripLocation, Member } from "@/lib/types";
import {
  MapPin,
  Calendar,
  Plus,
  Trash2,
  Check,
  Clock,
  Plane,
  Utensils,
  Car,
  BedDouble,
  Camera,
  ShoppingBag,
  Receipt,
  X,
  Loader2,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, typeof Receipt> = {
  food: Utensils,
  transport: Car,
  accommodation: BedDouble,
  activity: Camera,
  shopping: ShoppingBag,
  other: Receipt,
};

const CATEGORY_COLORS: Record<string, string> = {
  food: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
  transport: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400",
  accommodation: "bg-trevio-50 dark:bg-trevio-900/20 text-trevio-600 dark:text-trevio-400",
  activity: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
  shopping: "bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400",
  other: "bg-slate-100 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400",
};

interface TripViewProps {
  groupId: string;
  members: Member[];
}

export function TripView({ groupId, members }: TripViewProps) {
  const { trip } = useServices();
  const { formatBase, formatDate: formatDateFn } = useCurrencyDisplay();
  const queryClient = useQueryClient();
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);

  const { data: tripData, isLoading } = useQuery({
    queryKey: ["tripData", groupId],
    queryFn: () => trip.getTripData(groupId),
  });

  const addItineraryMutation = useMutation({
    mutationFn: (item: Omit<TripItineraryItem, "itemId">) => trip.addItineraryItem(groupId, item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tripData", groupId] });
      setShowAddItem(false);
    },
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: ({ itemId, completed }: { itemId: string; completed: boolean }) =>
      trip.updateItineraryItem(groupId, itemId, { completed }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tripData", groupId] }),
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => trip.removeItineraryItem(groupId, itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tripData", groupId] }),
  });

  const addLocationMutation = useMutation({
    mutationFn: (location: Omit<TripLocation, "locationId">) => trip.addLocation(groupId, location),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tripData", groupId] });
      setShowAddLocation(false);
    },
  });

  const removeLocationMutation = useMutation({
    mutationFn: (locationId: string) => trip.removeLocation(groupId, locationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tripData", groupId] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-trevio-500" />
      </div>
    );
  }

  const itinerary = tripData?.itinerary || [];
  const locations = tripData?.locations || [];

  const groupedByDay = itinerary.reduce((acc, item) => {
    const dayKey = item.date ? new Date(item.date).toDateString() : "No date";
    if (!acc[dayKey]) acc[dayKey] = [];
    acc[dayKey].push(item);
    return acc;
  }, {} as Record<string, TripItineraryItem[]>);

  const sortedDays = Object.entries(groupedByDay).sort(([a], [b]) => {
    if (a === "No date") return 1;
    if (b === "No date") return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  });

  const totalEstimatedCost = itinerary.reduce((sum, item) => sum + item.estimatedCost, 0);
  const completedCount = itinerary.filter((i) => i.completed).length;

  return (
    <div className="space-y-6">
      {/* Trip Header */}
      <div className="rounded-2xl bg-gradient-to-br from-trevio-500 to-trevio-700 p-5 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Plane className="h-5 w-5" />
          <h3 className="text-lg font-bold">
            {tripData?.destination || "Set your destination"}
          </h3>
        </div>
        {tripData?.startDate && tripData?.endDate ? (
          <p className="text-sm text-white/80">
            {formatDateFn(tripData.startDate)} - {formatDateFn(tripData.endDate)}
          </p>
        ) : (
          <p className="text-sm text-white/70">Add dates to your trip</p>
        )}
        <div className="mt-3 flex gap-4 text-sm">
          <div>
            <p className="text-white/70 text-xs">Items</p>
            <p className="font-semibold">{itinerary.length}</p>
          </div>
          <div>
            <p className="text-white/70 text-xs">Completed</p>
            <p className="font-semibold">{completedCount}/{itinerary.length}</p>
          </div>
          <div>
            <p className="text-white/70 text-xs">Est. Cost</p>
            <p className="font-semibold">{formatBase(totalEstimatedCost)}</p>
          </div>
        </div>
      </div>

      {/* Itinerary Timeline */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-trevio-600 dark:text-trevio-400" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Itinerary</h3>
          </div>
          <button
            onClick={() => setShowAddItem(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-trevio-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-trevio-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Item
          </button>
        </div>

        {sortedDays.length > 0 ? (
          <div className="space-y-4">
            {sortedDays.map(([dayKey, items]) => (
              <div key={dayKey}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 rounded-full bg-trevio-500" />
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {dayKey === "No date" ? "Unscheduled" : new Date(dayKey).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatBase(items.reduce((s, i) => s + i.estimatedCost, 0))}
                  </span>
                </div>
                <div className="ml-4 space-y-2 border-l-2 border-slate-100 dark:border-slate-700 pl-4">
                  {items.map((item) => {
                    const CatIcon = CATEGORY_ICONS[item.category] || Receipt;
                    const catColor = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.other;
                    return (
                      <div
                        key={item.itemId}
                        className={`rounded-xl border p-3 transition group ${
                          item.completed
                            ? "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${catColor}`}>
                            <CatIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-medium text-slate-900 dark:text-slate-100 ${item.completed ? "line-through opacity-60" : ""}`}>
                                {item.title}
                              </p>
                            </div>
                            {item.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              {item.location && (
                                <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                                  <MapPin className="h-3 w-3" />
                                  {item.location}
                                </span>
                              )}
                              {item.estimatedCost > 0 && (
                                <span className="text-xs font-medium text-trevio-600 dark:text-trevio-400">
                                  {formatBase(item.estimatedCost)}
                                </span>
                              )}
                              {item.assignedTo.length > 0 && (
                                <div className="flex items-center gap-1">
                                  {item.assignedTo.slice(0, 3).map((uid) => {
                                    const m = members.find((mem) => mem.uid === uid);
                                    return m ? (
                                      <Avatar key={uid} photoURL={m.photoURL} displayName={m.displayName} className="h-4 w-4" textClassName="text-[7px]" />
                                    ) : null;
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={() => toggleCompleteMutation.mutate({ itemId: item.itemId, completed: !item.completed })}
                              className={`rounded-lg p-1.5 transition ${item.completed ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20" : "text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"}`}
                              title={item.completed ? "Mark incomplete" : "Mark complete"}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => removeItemMutation.mutate(item.itemId)}
                              className="rounded-lg p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                              title="Remove"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-12 text-center">
            <Calendar className="h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No itinerary items yet. Add your first activity!</p>
          </div>
        )}
      </div>

      {/* Locations */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-trevio-600 dark:text-trevio-400" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Locations</h3>
          </div>
          <button
            onClick={() => setShowAddLocation(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-trevio-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-trevio-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Location
          </button>
        </div>

        {locations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {locations.map((loc) => {
              const CatIcon = CATEGORY_ICONS[loc.category] || Receipt;
              const catColor = CATEGORY_COLORS[loc.category] || CATEGORY_COLORS.other;
              return (
                <div
                  key={loc.locationId}
                  className="group rounded-xl border border-slate-200 dark:border-slate-700 p-3 transition hover:shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${catColor}`}>
                      <CatIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{loc.name}</p>
                      {loc.address && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{loc.address}</p>
                      )}
                      {loc.visitedOn ? (
                        <p className="text-xs text-trevio-600 dark:text-trevio-400 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateFn(loc.visitedOn)}
                        </p>
                      ) : null}
                    </div>
                    <button
                      onClick={() => removeLocationMutation.mutate(loc.locationId)}
                      className="rounded-lg p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center py-12 text-center">
            <MapPin className="h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No locations added yet.</p>
          </div>
        )}
      </div>

      {/* Add Item Dialog */}
      {showAddItem && (
        <AddItemDialog
          members={members}
          onClose={() => setShowAddItem(false)}
          onAdd={(item) => addItineraryMutation.mutate(item)}
          isPending={addItineraryMutation.isPending}
        />
      )}

      {/* Add Location Dialog */}
      {showAddLocation && (
        <AddLocationDialog
          onClose={() => setShowAddLocation(false)}
          onAdd={(loc) => addLocationMutation.mutate(loc)}
          isPending={addLocationMutation.isPending}
        />
      )}
    </div>
  );
}

function AddItemDialog({
  members,
  onClose,
  onAdd,
  isPending,
}: {
  members: Member[];
  onClose: () => void;
  onAdd: (item: Omit<TripItineraryItem, "itemId">) => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("other");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [assignedTo, setAssignedTo] = useState<string[]>([]);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      description: description.trim(),
      date: date ? new Date(date).getTime() : 0,
      location: location.trim(),
      category,
      estimatedCost: parseFloat(estimatedCost) || 0,
      assignedTo,
      completed: false,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add Itinerary Item</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (e.g. Visit Eiffel Tower)"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
            />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location"
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
            >
              <option value="food">Food</option>
              <option value="transport">Transport</option>
              <option value="accommodation">Accommodation</option>
              <option value="activity">Activity</option>
              <option value="shopping">Shopping</option>
              <option value="other">Other</option>
            </select>
            <input
              type="number"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              placeholder="Est. cost"
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
            />
          </div>
          {members.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Assign to</p>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <button
                    key={m.uid}
                    onClick={() => setAssignedTo((prev) => prev.includes(m.uid) ? prev.filter((u) => u !== m.uid) : [...prev, m.uid])}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                      assignedTo.includes(m.uid)
                        ? "bg-trevio-600 text-white"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <Avatar photoURL={m.photoURL} displayName={m.displayName} className="h-4 w-4" textClassName="text-[7px]" />
                    {m.displayName.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || isPending}
            className="w-full rounded-xl bg-trevio-600 py-3 text-sm font-semibold text-white transition hover:bg-trevio-700 disabled:opacity-50"
          >
            {isPending ? "Adding..." : "Add Item"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddLocationDialog({
  onClose,
  onAdd,
  isPending,
}: {
  onClose: () => void;
  onAdd: (loc: Omit<TripLocation, "locationId">) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [category, setCategory] = useState("other");

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      address: address.trim(),
      latitude: parseFloat(latitude) || 0,
      longitude: parseFloat(longitude) || 0,
      category,
      visitedOn: 0,
      expenseId: "",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add Location</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Location name (e.g. Hotel Taj)"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
          />
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Address"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="Latitude"
              step="any"
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
            />
            <input
              type="number"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="Longitude"
              step="any"
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
          >
            <option value="food">Food</option>
            <option value="transport">Transport</option>
            <option value="accommodation">Accommodation</option>
            <option value="activity">Activity</option>
            <option value="shopping">Shopping</option>
            <option value="other">Other</option>
          </select>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || isPending}
            className="w-full rounded-xl bg-trevio-600 py-3 text-sm font-semibold text-white transition hover:bg-trevio-700 disabled:opacity-50"
          >
            {isPending ? "Adding..." : "Add Location"}
          </button>
        </div>
      </div>
    </div>
  );
}
