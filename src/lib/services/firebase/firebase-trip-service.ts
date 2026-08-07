import { doc, getDoc, setDoc, updateDoc, deleteField } from "firebase/firestore";
import { db } from "../../firebase";
import type { TripService } from "../interfaces/trip-service";
import type { TripData, TripItineraryItem, TripLocation } from "../../types";

export class FirebaseTripService implements TripService {
  private tripDocRef(groupId: string) {
    return doc(db, "groups", groupId, "trip", "data");
  }

  async getTripData(groupId: string): Promise<TripData | null> {
    const snap = await getDoc(this.tripDocRef(groupId));
    if (!snap.exists()) return null;
    const data = snap.data() as Record<string, unknown>;
    return {
      startDate: (data.startDate as number) || 0,
      endDate: (data.endDate as number) || 0,
      destination: (data.destination as string) || "",
      coverPhotoURL: (data.coverPhotoURL as string) || "",
      itinerary: (data.itinerary as TripItineraryItem[]) || [],
      locations: (data.locations as TripLocation[]) || [],
    };
  }

  async updateTripData(groupId: string, tripData: Partial<TripData>): Promise<void> {
    const ref = this.tripDocRef(groupId);
    const snap = await getDoc(ref);
    const updates: Record<string, unknown> = {};
    if (tripData.startDate !== undefined) updates.startDate = tripData.startDate;
    if (tripData.endDate !== undefined) updates.endDate = tripData.endDate;
    if (tripData.destination !== undefined) updates.destination = tripData.destination;
    if (tripData.coverPhotoURL !== undefined) updates.coverPhotoURL = tripData.coverPhotoURL;
    if (tripData.itinerary !== undefined) updates.itinerary = tripData.itinerary;
    if (tripData.locations !== undefined) updates.locations = tripData.locations;

    if (snap.exists()) {
      await updateDoc(ref, updates);
    } else {
      await setDoc(ref, { ...updates, createdAt: Date.now() });
    }
  }

  async addItineraryItem(groupId: string, item: Omit<TripItineraryItem, "itemId">): Promise<string> {
    const tripData = await this.getTripData(groupId);
    const itemId = `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newItem: TripItineraryItem = { ...item, itemId };
    const itinerary = [...(tripData?.itinerary || []), newItem];
    await this.updateTripData(groupId, { itinerary });
    return itemId;
  }

  async updateItineraryItem(groupId: string, itemId: string, updates: Partial<TripItineraryItem>): Promise<void> {
    const tripData = await this.getTripData(groupId);
    if (!tripData) return;
    const itinerary = tripData.itinerary.map((item) =>
      item.itemId === itemId ? { ...item, ...updates } : item
    );
    await this.updateTripData(groupId, { itinerary });
  }

  async removeItineraryItem(groupId: string, itemId: string): Promise<void> {
    const tripData = await this.getTripData(groupId);
    if (!tripData) return;
    const itinerary = tripData.itinerary.filter((item) => item.itemId !== itemId);
    await this.updateTripData(groupId, { itinerary });
  }

  async addLocation(groupId: string, location: Omit<TripLocation, "locationId">): Promise<string> {
    const tripData = await this.getTripData(groupId);
    const locationId = `loc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newLocation: TripLocation = { ...location, locationId };
    const locations = [...(tripData?.locations || []), newLocation];
    await this.updateTripData(groupId, { locations });
    return locationId;
  }

  async removeLocation(groupId: string, locationId: string): Promise<void> {
    const tripData = await this.getTripData(groupId);
    if (!tripData) return;
    const locations = tripData.locations.filter((loc) => loc.locationId !== locationId);
    await this.updateTripData(groupId, { locations });
  }
}
