/**
 * 入力内容から媒体別の下書きを組み立てる。
 *
 * 外部APIは使わない。すべてこのファイル内のテンプレートで完結する。
 * 空欄の項目は行ごと省くので、「今日の出来事」だけでも文章になる。
 */

import type { PlatformId, PostInput, ToneId } from '../types/post';
import { X_UNIT_LIMIT, clampToXUnits, countXUnits } from './characterCount';

/** Instagramのハッシュタグ上限 */
const INSTAGRAM_TAG_LIMIT = 30;
/** Xに載せるハッシュタグの数（本文を圧迫しないよう絞る） */
const X_TAG_LIMIT = 2;

interface ToneVoice {
  /** 今日の出来事の前に置く一言 */
  lead: string;
  /** 伝えたい相手への一文 */
  audience: (value: string) => string;
  /** 商品・サービスの紹介文 */
  service: (value: string) => string;
  /** Xで使う短い商品・サービス紹介 */
  serviceShort: (value: string) => string;
  /** お知らせの見出し */
  announceLabel: string;
  /** Xで使う短いお知らせの見出し */
  announceShort: string;
  ctaInstagram: string;
  ctaX: string;
  ctaLine: string;
  /** LINEの書き出しのあいさつ */
  lineGreeting: string;
}

const VOICES: Record<ToneId, ToneVoice> = {
  friendly: {
    lead: '今日のできごとです。',
    audience: (value) => `${value}に届くとうれしいです。`,
    service: (value) => `${value}をやっています。`,
    serviceShort: (value) => `${value}をやっています。`,
    announceLabel: '📣 お知らせ',
    announceShort: '【お知らせ】',
    ctaInstagram: '気になることがあれば、コメントやDMで気軽に聞いてくださいね。',
    ctaX: '気軽に聞いてくださいね。',
    ctaLine: 'ご予約・ご相談は、このトークからどうぞ。',
    lineGreeting: 'こんにちは。いつもありがとうございます。',
  },
  polite: {
    lead: '本日のご報告です。',
    audience: (value) => `${value}のお役に立てましたら幸いです。`,
    service: (value) => `${value}を承っております。`,
    serviceShort: (value) => `${value}を承っております。`,
    announceLabel: '【お知らせ】',
    announceShort: '【お知らせ】',
    ctaInstagram: 'ご質問はコメント、またはDMにてお気軽にお寄せください。',
    ctaX: 'お気軽にお問い合わせください。',
    ctaLine: 'ご予約・ご相談は、このトークよりお気軽にご連絡ください。',
    lineGreeting: 'いつもご利用いただきありがとうございます。',
  },
  casual: {
    lead: '今日あったこと。',
    audience: (value) => `${value}に読んでもらえたらうれしいです。`,
    service: (value) => `やっているのは${value}です。`,
    serviceShort: (value) => `やってるのは${value}。`,
    announceLabel: '📣 おしらせ',
    announceShort: '【おしらせ】',
    ctaInstagram: '気になったら、コメントかDMで聞いてください。',
    ctaX: '気になったらDMどうぞ。',
    ctaLine: 'ご予約も相談も、このトークからどうぞ。',
    lineGreeting: 'こんにちは！',
  },
  cheerful: {
    lead: '今日はうれしいことがありました！',
    audience: (value) => `${value}のみなさん、ぜひ読んでください！`,
    service: (value) => `${value}をやっています✨`,
    serviceShort: (value) => `${value}やってます✨`,
    announceLabel: '📣 お知らせ',
    announceShort: '【お知らせ】',
    ctaInstagram: '気になった方は、コメント・DMお待ちしています！',
    ctaX: 'お気軽にどうぞ！',
    ctaLine: 'ご予約・ご相談は、このトークからお気軽に！',
    lineGreeting: 'こんにちは！いつもありがとうございます！',
  },
  calm: {
    lead: '今日のできごとを、少しだけ。',
    audience: (value) => `${value}の方に届けばと思います。`,
    service: (value) => `${value}をしています。`,
    serviceShort: (value) => `${value}をしています。`,
    announceLabel: 'お知らせ',
    announceShort: '【お知らせ】',
    ctaInstagram: '気になることがあれば、コメントやDMでお知らせください。',
    ctaX: 'お気軽にどうぞ。',
    ctaLine: 'ご予約・ご相談は、このトークからお受けしています。',
    lineGreeting: 'こんにちは。',
  },
};

/** 前後の空白を落とし、3行以上の空行を2行にそろえる */
function normalizeBlock(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t　]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** 改行を空白に置き換えて1行にする（X用） */
function toSingleLine(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[\s　]+/g, ' ')
    .trim();
}

/**
 * ハッシュタグ入力を配列に整える。
 * 「#」の有無、スペース・読点・改行のどれで区切っても受け付ける。
 */
export function parseHashtags(raw: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const piece of raw.split(/[\s　,、･・]+/)) {
    const tag = piece.replace(/[#＃]/g, '').trim();
    if (!tag) continue;

    const key = tag.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    tags.push(`#${tag}`);
  }

  return tags;
}

/** 空要素を落として結合する小さな補助 */
function join(parts: Array<string | null | undefined>, separator: string): string {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(separator);
}

function buildInstagram(input: PostInput, voice: ToneVoice): string {
  const event = normalizeBlock(input.todayEvent);
  const service = input.service.trim();
  const audience = input.audience.trim();
  const announcement = normalizeBlock(input.announcement);
  const tags = parseHashtags(input.hashtags).slice(0, INSTAGRAM_TAG_LIMIT);

  const blocks: string[] = [];

  if (event) {
    blocks.push(join([voice.lead, event], '\n'));
  }

  const intro = join(
    [audience ? voice.audience(audience) : '', service ? voice.service(service) : ''],
    '\n',
  );
  if (intro) blocks.push(intro);

  if (announcement) {
    blocks.push(`${voice.announceLabel}\n${announcement}`);
  }

  blocks.push(voice.ctaInstagram);

  if (tags.length > 0) {
    blocks.push(tags.join(' '));
  }

  return join(blocks, '\n\n');
}

function buildX(input: PostInput, voice: ToneVoice): string {
  const event = toSingleLine(input.todayEvent);
  const service = input.service.trim();
  const announcement = toSingleLine(input.announcement);
  const tags = parseHashtags(input.hashtags).slice(0, X_TAG_LIMIT);

  // 出来事以外を先に固定し、残りの文字数を出来事に割り当てる。
  const fixedParts = [
    service ? voice.serviceShort(service) : '',
    announcement ? `${voice.announceShort}${announcement}` : '',
    voice.ctaX,
    tags.length > 0 ? tags.join(' ') : '',
  ];

  const fixed = join(fixedParts, '\n');
  if (!event) return fixed;

  // 出来事と固定部分の間の改行1つぶん（1単位）も予算から引く。
  const budget = X_UNIT_LIMIT - countXUnits(fixed) - (fixed ? 1 : 0);
  const trimmedEvent = clampToXUnits(event, budget);

  return join([trimmedEvent, fixed], '\n');
}

function buildLine(input: PostInput, voice: ToneVoice): string {
  const event = normalizeBlock(input.todayEvent);
  const service = input.service.trim();
  const audience = input.audience.trim();
  const announcement = normalizeBlock(input.announcement);

  const blocks: string[] = [voice.lineGreeting];

  if (event) blocks.push(event);

  const intro = join(
    [audience ? voice.audience(audience) : '', service ? voice.service(service) : ''],
    '\n',
  );
  if (intro) blocks.push(intro);

  if (announcement) {
    blocks.push(`${voice.announceLabel}\n${announcement}`);
  }

  blocks.push(voice.ctaLine);

  // LINE公式はハッシュタグを使わないので載せない。
  return join(blocks, '\n\n');
}

/** 指定した媒体の下書きを組み立てる */
export function buildDraft(platform: PlatformId, input: PostInput): string {
  const voice = VOICES[input.tone] ?? VOICES.friendly;

  switch (platform) {
    case 'instagram':
      return buildInstagram(input, voice);
    case 'x':
      return buildX(input, voice);
    case 'line':
      return buildLine(input, voice);
    default:
      return '';
  }
}
