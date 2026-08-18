import type { Nudge } from "../../types";

export interface NudgeService {
  getActiveNudges(): Promise<Nudge[]>;
  generateNudges(): Promise<Nudge[]>;
  dismissNudge(nudgeId: string): Promise<void>;
  markNudgeRead(nudgeId: string): Promise<void>;
}
