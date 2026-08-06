import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { PlatformMeta } from '../types/post';
import { measureUsage } from '../utils/characterCount';

interface PostPreviewProps {
  platform: PlatformMeta;
  /** 表示する本文（自動生成、または利用者が編集したもの） */
  text: string;
  /** 利用者が手で直しているか */
  isEdited: boolean;
  onChange: (next: string) => void;
  /** 入力内容から作り直す（編集を破棄する） */
  onRegenerate: () => void;
}

type CopyState = 'idle' | 'copied' | 'failed';

/** クリップボードにコピーする。使えない環境では旧方式にフォールバックする。 */
async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 権限が無いなどで失敗した場合は下の方式を試す
  }

  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/** 媒体1つぶんの下書きカード。編集・文字数表示・コピーを担当する。 */
export function PostPreview({
  platform,
  text,
  isEdited,
  onChange,
  onRegenerate,
}: PostPreviewProps) {
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const usage = measureUsage(platform.id, text);
  const countClass = usage.isOver
    ? 'count count--over'
    : usage.isNearLimit
      ? 'count count--near'
      : 'count';

  const handleCopy = async () => {
    const ok = await copyToClipboard(text);
    setCopyState(ok ? 'copied' : 'failed');

    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopyState('idle'), 2000);
  };

  const handleEdit = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  const textareaId = `draft-${platform.id}`;

  return (
    <article className="card preview" aria-labelledby={`${textareaId}-label`}>
      <div className="card__head">
        <div>
          <h3 className="card__title" id={`${textareaId}-label`}>
            <span aria-hidden="true">{platform.icon}</span> {platform.label}
          </h3>
          <p className="card__sub">{platform.hint}</p>
        </div>
        <div className="preview__meta">
          <span className={countClass}>
            {usage.used} / {usage.limit}文字
          </span>
          {usage.note && <span className="count__note">{usage.note}</span>}
        </div>
      </div>

      {usage.isOver && (
        <p className="notice notice--warn" role="status">
          {platform.label}の目安を{usage.used - usage.limit}文字超えています。少し削ってください。
        </p>
      )}

      <label className="sr-only" htmlFor={textareaId}>
        {platform.label}の下書き
      </label>
      <textarea
        id={textareaId}
        className="input input--draft"
        rows={12}
        value={text}
        onChange={handleEdit}
        placeholder="左のフォームに書き込むと、ここに下書きが出ます。"
        spellCheck={false}
      />

      <div className="preview__actions">
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleCopy}
          disabled={!text}
        >
          {copyState === 'copied'
            ? 'コピーしました'
            : copyState === 'failed'
              ? 'コピーできません'
              : 'この文をコピー'}
        </button>

        {isEdited && (
          <button type="button" className="btn btn--ghost" onClick={onRegenerate}>
            入力から作り直す
          </button>
        )}
      </div>

      {isEdited && (
        <p className="notice" role="status">
          手直し中のため、フォームを変えてもこの文は自動で書き換わりません。
        </p>
      )}

      {copyState === 'failed' && (
        <p className="notice notice--warn" role="status">
          自動コピーができませんでした。本文を選んでコピーしてください。
        </p>
      )}
    </article>
  );
}
