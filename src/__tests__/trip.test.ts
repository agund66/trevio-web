import { describe, it, expect } from "vitest";
import type { TripItineraryItem, TripLocation, TripData } from "@/lib/types";

describe("Trip Types - TripItineraryItem", () => {
  it("creates a valid itinerary item", () => {
    const item: TripItineraryItem = {
      itemId: "item_1",
      title: "Visit Eiffel Tower",
      description: "Morning visit",
      date: Date.now(),
      location: "Paris",
      latitude: 48.8584,
      longitude: 2.2945,
      category: "activity",
      estimatedCost: 500,
      assignedTo: ["u1", "u2"],
      completed: false,
    };
    expect(item.itemId).toBe("item_1");
    expect(item.title).toBe("Visit Eiffel Tower");
    expect(item.assignedTo).toHaveLength(2);
    expect(item.completed).toBe(false);
  });

  it("allows optional latitude/longitude", () => {
    const item: TripItineraryItem = {
      itemId: "item_2",
      title: "Lunch",
      description: "",
      date: 0,
      location: "Cafe",
      category: "food",
      estimatedCost: 100,
      assignedTo: [],
      completed: false,
    };
    expect(item.latitude).toBeUndefined();
    expect(item.longitude).toBeUndefined();
  });
});

describe("Trip Types - TripLocation", () => {
  it("creates a valid location", () => {
    const loc: TripLocation = {
      locationId: "loc_1",
      name: "Hotel Taj",
      latitude: 18.922,
      longitude: 72.834,
      address: "Apollo Bunder, Mumbai",
      category: "accommodation",
      visitedOn: Date.now(),
      expenseId: "exp_1",
    };
    expect(loc.locationId).toBe("loc_1");
    expect(loc.name).toBe("Hotel Taj");
  });

  it("allows optional visitedOn and expenseId", () => {
    const loc: TripLocation = {
      locationId: "loc_2",
      name: "Beach",
      latitude: 0,
      longitude: 0,
      address: "",
      category: "activity",
    };
    expect(loc.visitedOn).toBeUndefined();
    expect(loc.expenseId).toBeUndefined();
  });
});

describe("Trip Types - TripData", () => {
  it("creates valid trip data", () => {
    const trip: TripData = {
      startDate: Date.now(),
      endDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
      destination: "Goa",
      coverPhotoURL: "",
      itinerary: [],
      locations: [],
    };
    expect(trip.destination).toBe("Goa");
    expect(trip.itinerary).toEqual([]);
    expect(trip.locations).toEqual([]);
  });

  it("can hold multiple itinerary items and locations", () => {
    const trip: TripData = {
      startDate: 0,
      endDate: 0,
      destination: "Manali",
      coverPhotoURL: "",
      itinerary: [
        { itemId: "1", title: "A", description: "", date: 0, location: "", category: "other", estimatedCost: 0, assignedTo: [], completed: false },
        { itemId: "2", title: "B", description: "", date: 0, location: "", category: "other", estimatedCost: 0, assignedTo: [], completed: false },
      ],
      locations: [
        { locationId: "1", name: "X", latitude: 0, longitude: 0, address: "", category: "other" },
      ],
    };
    expect(trip.itinerary).toHaveLength(2);
    expect(trip.locations).toHaveLength(1);
  });
});

describe("Trip Itinerary Grouping Logic", () => {
  it("groups items by day", () => {
    const items: TripItineraryItem[] = [
      { itemId: "1", title: "A", description: "", date: new Date(2024, 0, 15).getTime(), location: "", category: "other", estimatedCost: 0, assignedTo: [], completed: false },
      { itemId: "2", title: "B", description: "", date: new Date(2024, 0, 15).getTime(), location: "", category: "other", estimatedCost: 0, assignedTo: [], completed: false },
      { itemId: "3", title: "C", description: "", date: new Date(2024, 0, 16).getTime(), location: "", category: "other", estimatedCost: 0, assignedTo: [], completed: false },
    ];
    const grouped = items.reduce((acc, item) => {
      const dayKey = new Date(item.date).toDateString();
      if (!acc[dayKey]) acc[dayKey] = [];
      acc[dayKey].push(item);
      return acc;
    }, {} as Record<string, TripItineraryItem[]>);
    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped[Object.keys(grouped)[0]]).toHaveLength(2);
  });

  it("sorts days chronologically", () => {
    const items: TripItineraryItem[] = [
      { itemId: "1", title: "Late", description: "", date: new Date(2024, 5, 15).getTime(), location: "", category: "other", estimatedCost: 0, assignedTo: [], completed: false },
      { itemId: "2", title: "Early", description: "", date: new Date(2024, 0, 15).getTime(), location: "", category: "other", estimatedCost: 0, assignedTo: [], completed: false },
    ];
    const grouped = items.reduce((acc, item) => {
      const dayKey = new Date(item.date).toDateString();
      if (!acc[dayKey]) acc[dayKey] = [];
      acc[dayKey].push(item);
      return acc;
    }, {} as Record<string, TripItineraryItem[]>);
    const sorted = Object.entries(grouped).sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime());
    expect(sorted[0][1][0].title).toBe("Early");
    expect(sorted[1][1][0].title).toBe("Late");
  });

  it("calculates total estimated cost", () => {
    const items: TripItineraryItem[] = [
      { itemId: "1", title: "A", description: "", date: 0, location: "", category: "other", estimatedCost: 100, assignedTo: [], completed: false },
      { itemId: "2", title: "B", description: "", date: 0, location: "", category: "other", estimatedCost: 200, assignedTo: [], completed: false },
    ];
    const total = items.reduce((sum, item) => sum + item.estimatedCost, 0);
    expect(total).toBe(300);
  });

  it("counts completed items", () => {
    const items: TripItineraryItem[] = [
      { itemId: "1", title: "A", description: "", date: 0, location: "", category: "other", estimatedCost: 0, assignedTo: [], completed: true },
      { itemId: "2", title: "B", description: "", date: 0, location: "", category: "other", estimatedCost: 0, assignedTo: [], completed: false },
      { itemId: "3", title: "C", description: "", date: 0, location: "", category: "other", estimatedCost: 0, assignedTo: [], completed: true },
    ];
    const completed = items.filter((i) => i.completed).length;
    expect(completed).toBe(2);
  });
});

// ─── Edge cases ───────────────────────────────────────────────────

describe("Trip Edge Cases", () => {
  it("empty itinerary and locations is valid trip data", () => {
    const trip: TripData = {
      startDate: 0,
      endDate: 0,
      destination: "",
      coverPhotoURL: "",
      itinerary: [],
      locations: [],
    };
    expect(trip.itinerary).toHaveLength(0);
    expect(trip.locations).toHaveLength(0);
  });

  it("itinerary items sort by date chronologically", () => {
    const items: TripItineraryItem[] = [
      { itemId: "3", title: "Dinner", description: "", date: new Date(2024, 5, 16).getTime(), location: "", category: "food", estimatedCost: 200, assignedTo: ["u1"], completed: false },
      { itemId: "1", title: "Breakfast", description: "", date: new Date(2024, 5, 15).getTime(), location: "", category: "food", estimatedCost: 50, assignedTo: ["u1"], completed: false },
      { itemId: "2", title: "Lunch", description: "", date: new Date(2024, 5, 15, 12).getTime(), location: "", category: "food", estimatedCost: 100, assignedTo: ["u1"], completed: false },
    ];
    const sorted = [...items].sort((a, b) => a.date - b.date);
    expect(sorted[0].title).toBe("Breakfast");
    expect(sorted[1].title).toBe("Lunch");
    expect(sorted[2].title).toBe("Dinner");
  });

  it("trip with only locations (no itinerary) is valid", () => {
    const trip: TripData = {
      startDate: Date.now(),
      endDate: Date.now() + 3 * 24 * 60 * 60 * 1000,
      destination: "Goa",
      coverPhotoURL: "",
      itinerary: [],
      locations: [
        { locationId: "1", name: "Beach", latitude: 15.5, longitude: 73.8, address: "Goa", category: "activity" },
        { locationId: "2", name: "Hotel", latitude: 15.4, longitude: 73.9, address: "Panjim", category: "accommodation" },
      ],
    };
    expect(trip.itinerary).toHaveLength(0);
    expect(trip.locations).toHaveLength(2);
  });

  it("completed percentage calculation", () => {
    const items: TripItineraryItem[] = [
      { itemId: "1", title: "A", description: "", date: 0, location: "", category: "other", estimatedCost: 0, assignedTo: [], completed: true },
      { itemId: "2", title: "B", description: "", date: 0, location: "", category: "other", estimatedCost: 0, assignedTo: [], completed: false },
      { itemId: "3", title: "C", description: "", date: 0, location: "", category: "other", estimatedCost: 0, assignedTo: [], completed: true },
      { itemId: "4", title: "D", description: "", date: 0, location: "", category: "other", estimatedCost: 0, assignedTo: [], completed: true },
    ];
    const completed = items.filter((i) => i.completed).length;
    const pct = (completed / items.length) * 100;
    expect(pct).toBe(75);
  });

  it("location can be linked to an expense via expenseId", () => {
    const loc: TripLocation = {
      locationId: "loc_1",
      name: "Restaurant",
      latitude: 0,
      longitude: 0,
      address: "",
      category: "food",
      visitedOn: Date.now(),
      expenseId: "exp_123",
    };
    expect(loc.expenseId).toBe("exp_123");
  });

  it("itinerary item with assignedTo tracks who participates", () => {
    const item: TripItineraryItem = {
      itemId: "i1",
      title: "Safari",
      description: "",
      date: 0,
      location: "",
      category: "activity",
      estimatedCost: 1500,
      assignedTo: ["u1", "u2", "u3"],
      completed: false,
    };
    expect(item.assignedTo).toHaveLength(3);
    expect(item.assignedTo).toContain("u2");
  });
});
