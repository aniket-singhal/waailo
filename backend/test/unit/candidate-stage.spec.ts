import { canAdvance, canReject, isTerminal, nextStage } from 'src/modules/recruitment/candidate-stage';

describe('Candidate stage machine', () => {
  it('advances forward one stage at a time', () => {
    expect(nextStage('APPLIED')).toBe('SCREENING');
    expect(nextStage('SCREENING')).toBe('INTERVIEW');
    expect(nextStage('INTERVIEW')).toBe('OFFER');
    expect(nextStage('OFFER')).toBe('HIRED');
  });

  it('has no forward stage from terminal states', () => {
    expect(nextStage('HIRED')).toBeNull();
    expect(nextStage('REJECTED')).toBeNull();
    expect(canAdvance('HIRED')).toBe(false);
    expect(canAdvance('REJECTED')).toBe(false);
  });

  it('marks terminal states', () => {
    expect(isTerminal('HIRED')).toBe(true);
    expect(isTerminal('REJECTED')).toBe(true);
    expect(isTerminal('APPLIED')).toBe(false);
  });

  it('allows rejection only from active stages', () => {
    expect(canReject('APPLIED')).toBe(true);
    expect(canReject('OFFER')).toBe(true);
    expect(canReject('HIRED')).toBe(false);
    expect(canReject('REJECTED')).toBe(false);
  });
});
