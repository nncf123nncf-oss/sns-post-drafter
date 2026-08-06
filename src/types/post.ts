/**
 * SNS投稿下書きツールの型定義。
 * 入力はすべて利用者が手で書いた文字列で、外部へは一切送らない。
 */

/** 下書きを作る媒体 */
export type PlatformId = 'instagram' | 'x' | 'line';

/** 投稿の雰囲気（口調） */
export type ToneId = 'friendly' | 'polite' | 'casual' | 'cheerful' | 'calm';

/** フォームの入力内容。すべて任意で、空欄はテンプレートから自動的に省かれる。 */
export interface PostInput {
  /** 今日の出来事（投稿の中心になる話） */
  todayEvent: string;
  /** 商品・サービス */
  service: string;
  /** 伝えたい相手 */
  audience: string;
  /** 投稿の雰囲気 */
  tone: ToneId;
  /** お知らせ（休業・キャンペーン・空き枠など） */
  announcement: string;
  /** ハッシュタグ（スペースや読点区切り。#はあってもなくてもよい） */
  hashtags: string;
}

/** 各媒体の下書き本文。利用者が編集した場合はその内容が入る。 */
export type PostDrafts = Record<PlatformId, string>;

/** 利用者が手で直した媒体だけを保持する（未編集の媒体は自動更新を続ける） */
export type PostEdits = Partial<Record<PlatformId, string>>;

export interface PlatformMeta {
  id: PlatformId;
  label: string;
  /** カードの説明文。何を意識した下書きかを一言で伝える */
  hint: string;
  /** 媒体を表す絵文字（画像を持たないので文字で代用） */
  icon: string;
}

export interface ToneMeta {
  id: ToneId;
  label: string;
  /** 選ぶときの手がかりになる短い説明 */
  hint: string;
}

export const PLATFORMS: readonly PlatformMeta[] = [
  {
    id: 'instagram',
    label: 'Instagram',
    hint: 'エピソードを丁寧に。ハッシュタグつき',
    icon: '📷',
  },
  {
    id: 'x',
    label: 'X（旧Twitter）',
    hint: '140文字に収まるよう短くまとめます',
    icon: '📝',
  },
  {
    id: 'line',
    label: 'LINE公式',
    hint: 'お知らせと予約の案内を中心に',
    icon: '💬',
  },
] as const;

export const TONES: readonly ToneMeta[] = [
  { id: 'friendly', label: 'やさしい', hint: '柔らかい語りかけ' },
  { id: 'polite', label: 'ていねい', hint: 'きちんとした敬語' },
  { id: 'casual', label: 'カジュアル', hint: '肩の力を抜いた話し言葉' },
  { id: 'cheerful', label: 'げんき', hint: '明るく前向きに' },
  { id: 'calm', label: 'おちついた', hint: '静かで落ち着いた雰囲気' },
] as const;

export const EMPTY_INPUT: PostInput = {
  todayEvent: '',
  service: '',
  audience: '',
  tone: 'friendly',
  announcement: '',
  hashtags: '',
};

/** 入力が空かどうか（下書きを作るかの判定に使う） */
export function isInputEmpty(input: PostInput): boolean {
  return (
    !input.todayEvent.trim() &&
    !input.service.trim() &&
    !input.audience.trim() &&
    !input.announcement.trim() &&
    !input.hashtags.trim()
  );
}
