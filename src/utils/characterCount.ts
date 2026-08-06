/**
 * 文字数の数え方をまとめたユーティリティ。
 *
 * 絵文字や結合文字を1文字として数えたいので、可能なら Intl.Segmenter を使う。
 * Xだけは「全角1文字＝2」という独自の数え方をするため、専用の重み計算を持つ。
 */

import type { PlatformId } from '../types/post';

/** Xが1として数える文字コード範囲（それ以外は2として数える） */
const X_LIGHT_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0, 4351],
  [8192, 8205],
  [8208, 8223],
  [8242, 8243],
];

/** Xの内部単位での上限（全角換算で140文字ぶん） */
export const X_UNIT_LIMIT = 280;

const segmenter: Intl.Segmenter | null = (() => {
  try {
    return new Intl.Segmenter('ja', { granularity: 'grapheme' });
  } catch {
    return null;
  }
})();

/** 文字列を「見た目の1文字」ごとに分解する */
export function toGraphemes(text: string): string[] {
  if (segmenter) {
    return Array.from(segmenter.segment(text), (part) => part.segment);
  }
  return Array.from(text);
}

/** 見た目どおりの文字数（絵文字は1文字） */
export function countCharacters(text: string): number {
  return toGraphemes(text).length;
}

/** 1文字ぶんのXの重み。日本語や絵文字は2、半角英数は1。 */
function graphemeWeight(grapheme: string): number {
  const codePoints = Array.from(grapheme);
  if (codePoints.length !== 1) {
    // 肌色つき絵文字などの合成文字。Xは合成後の1文字として2で数える。
    return 2;
  }
  const code = codePoints[0].codePointAt(0) ?? 0;
  return X_LIGHT_RANGES.some(([low, high]) => code >= low && code <= high) ? 1 : 2;
}

/** Xの内部単位での長さ（上限280） */
export function countXUnits(text: string): number {
  let total = 0;
  for (const grapheme of toGraphemes(text)) {
    total += graphemeWeight(grapheme);
  }
  return total;
}

/** Xの単位数を全角換算の文字数に直す（表示用） */
export function xUnitsToCharacters(units: number): number {
  return Math.ceil(units / 2);
}

/**
 * Xの単位数が予算に収まるよう末尾を削る。削った場合は「…」を付ける。
 */
export function clampToXUnits(text: string, unitBudget: number): string {
  if (unitBudget <= 0) return '';
  if (countXUnits(text) <= unitBudget) return text;

  const ellipsis = '…';
  const reserved = countXUnits(ellipsis);
  const graphemes = toGraphemes(text);
  let used = 0;
  const kept: string[] = [];

  for (const grapheme of graphemes) {
    const weight = graphemeWeight(grapheme);
    if (used + weight > unitBudget - reserved) break;
    kept.push(grapheme);
    used += weight;
  }

  if (kept.length === 0) return '';
  return kept.join('').trimEnd() + ellipsis;
}

/** 各媒体の目安の文字数上限 */
export const PLATFORM_LIMITS: Record<PlatformId, number> = {
  /** Instagramのキャプション上限 */
  instagram: 2200,
  /** Xの全角換算の上限 */
  x: 140,
  /** LINE公式の1吹き出しの目安 */
  line: 500,
};

export interface CharacterUsage {
  /** 使用文字数 */
  used: number;
  /** 上限 */
  limit: number;
  /** 上限を超えているか */
  isOver: boolean;
  /** 上限の8割を超えているか（そろそろ注意） */
  isNearLimit: boolean;
  /** 数え方の補足（表示用。無い場合は空文字） */
  note: string;
}

/** 媒体ごとの文字数の使用状況を返す */
export function measureUsage(platform: PlatformId, text: string): CharacterUsage {
  const limit = PLATFORM_LIMITS[platform];
  const used =
    platform === 'x' ? xUnitsToCharacters(countXUnits(text)) : countCharacters(text);

  return {
    used,
    limit,
    isOver: used > limit,
    isNearLimit: used > limit * 0.8,
    note: platform === 'x' ? '全角換算（半角2文字＝1）' : '',
  };
}
