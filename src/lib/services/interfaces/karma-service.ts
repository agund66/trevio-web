import type { KarmaBreakdown } from "../../types";

export interface KarmaService {
  getKarmaBreakdown(): Promise<KarmaBreakdown>;
  refreshKarma(): Promise<KarmaBreakdown>;
  setKarmaPublic(isPublic: boolean): Promise<void>;
  getPublicKarma(uid: string): Promise<KarmaBreakdown | null>;
}
