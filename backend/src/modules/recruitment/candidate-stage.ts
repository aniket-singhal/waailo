import { CandidateStage } from '@prisma/client';

/**
 * Candidate pipeline state machine (pure, unit-tested). Candidates move forward
 * one stage at a time up to OFFER/HIRED, and can be REJECTED from any active stage.
 */
const FORWARD: Record<CandidateStage, CandidateStage | null> = {
  APPLIED: 'SCREENING',
  SCREENING: 'INTERVIEW',
  INTERVIEW: 'OFFER',
  OFFER: 'HIRED',
  HIRED: null,
  REJECTED: null,
};

export function nextStage(stage: CandidateStage): CandidateStage | null {
  return FORWARD[stage];
}

export function isTerminal(stage: CandidateStage): boolean {
  return stage === 'HIRED' || stage === 'REJECTED';
}

export function canReject(stage: CandidateStage): boolean {
  return !isTerminal(stage);
}

/** Allowed only when there is a forward stage and not terminal. */
export function canAdvance(stage: CandidateStage): boolean {
  return FORWARD[stage] !== null;
}
