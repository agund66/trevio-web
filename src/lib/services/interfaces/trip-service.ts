import type { TripData, TripItineraryItem, TripLocation } from "../../types";

export interface TripService {
  getTripData(groupId: string): Promise<TripData | null>;
  updateTripData(groupId: string, tripData: Partial<TripData>): Promise<void>;
  addItineraryItem(groupId: string, item: Omit<TripItineraryItem, "itemId">): Promise<string>;
  updateItineraryItem(groupId: string, itemId: string, updates: Partial<TripItineraryItem>): Promise<void>;
  removeItineraryItem(groupId: string, itemId: string): Promise<void>;
  addLocation(groupId: string, location: Omit<TripLocation, "locationId">): Promise<string>;
  removeLocation(groupId: string, locationId: string): Promise<void>;
}
