import { describe, expect, it } from 'vitest';
import { isValidLane, otherPlayer, resolveRangePattern } from '../../src/game/board';

describe('§15 Range', () => {
  it('Range 1 hits exactly the chosen single lane', () => {
    expect(resolveRangePattern(2, 1, 'center')).toEqual([2]);
    expect(resolveRangePattern(2, 1, 'left')).toEqual([1]);
    expect(resolveRangePattern(2, 1, 'right')).toEqual([3]);
  });

  it('Range 1 at the edge with no valid referent returns no lanes', () => {
    expect(resolveRangePattern(0, 1, 'left')).toEqual([]);
    expect(resolveRangePattern(4, 1, 'right')).toEqual([]);
  });

  it('Range 2 hits center + one chosen side', () => {
    expect(resolveRangePattern(2, 2, 'left')).toEqual([2, 1]);
    expect(resolveRangePattern(2, 2, 'right')).toEqual([2, 3]);
  });

  it('Range 2 at the edge clips the out-of-bounds side (§15 fewer targets)', () => {
    expect(resolveRangePattern(0, 2, 'left')).toEqual([0]);
    expect(resolveRangePattern(4, 2, 'right')).toEqual([4]);
  });

  it('Range 3 always hits left+center+right, clipped at the edges', () => {
    expect(resolveRangePattern(2, 3)).toEqual([1, 2, 3]);
    expect(resolveRangePattern(0, 3)).toEqual([0, 1]);
    expect(resolveRangePattern(4, 3)).toEqual([3, 4]);
  });
});

describe('board helpers', () => {
  it('isValidLane bounds-checks against BOARD_SIZE', () => {
    expect(isValidLane(0)).toBe(true);
    expect(isValidLane(4)).toBe(true);
    expect(isValidLane(-1)).toBe(false);
    expect(isValidLane(5)).toBe(false);
    expect(isValidLane(1.5)).toBe(false);
  });

  it('otherPlayer flips between the two boardgame.io playerIDs', () => {
    expect(otherPlayer('0')).toBe('1');
    expect(otherPlayer('1')).toBe('0');
  });
});
