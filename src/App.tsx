import { useEffect, useMemo, useState } from 'react';
import { PostForm } from './components/PostForm';
import { PostPreview } from './components/PostPreview';
import {
  EMPTY_INPUT,
  PLATFORMS,
  TONES,
  isInputEmpty,
  type PlatformId,
  type PostEdits,
  type PostInput,
  type ToneId,
} from './types/post';
import { buildDraft } from './utils/postTemplates';
import './App.css';

const STORAGE_KEY = 'sns-post-drafter:v1';
const SAVE_DELAY_MS = 400;

interface StoredState {
  version: 1;
  input: PostInput;
  edits: PostEdits;
}

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

const asTone = (value: unknown): ToneId => {
  const found = TONES.find((tone) => tone.id === value);
  return found ? found.id : EMPTY_INPUT.tone;
};

/** localStorageから復元する。壊れていたら黙って初期値に戻す。 */
function loadStored(): StoredState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const record = parsed as Record<string, unknown>;
    const storedInput = (record.input ?? {}) as Record<string, unknown>;
    const storedEdits = (record.edits ?? {}) as Record<string, unknown>;

    const edits: PostEdits = {};
    for (const platform of PLATFORMS) {
      const value = storedEdits[platform.id];
      if (typeof value === 'string') edits[platform.id] = value;
    }

    return {
      version: 1,
      input: {
        todayEvent: asString(storedInput.todayEvent),
        service: asString(storedInput.service),
        audience: asString(storedInput.audience),
        tone: asTone(storedInput.tone),
        announcement: asString(storedInput.announcement),
        hashtags: asString(storedInput.hashtags),
      },
      edits,
    };
  } catch {
    return null;
  }
}

export default function App() {
  const [input, setInput] = useState<PostInput>(() => loadStored()?.input ?? EMPTY_INPUT);
  const [edits, setEdits] = useState<PostEdits>(() => loadStored()?.edits ?? {});
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // 入力途中の内容を自動保存する（打つたびに書かないよう少し待つ）
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        // 中身が空になったら保存自体を消しておく（次回は初期状態で開く）
        if (isInputEmpty(input) && Object.keys(edits).length === 0) {
          window.localStorage.removeItem(STORAGE_KEY);
          setSavedAt(null);
          return;
        }

        const payload: StoredState = { version: 1, input, edits };
        const serialized = JSON.stringify(payload);

        // 復元直後など、中身が変わっていないときは書き込まない
        if (window.localStorage.getItem(STORAGE_KEY) === serialized) return;

        window.localStorage.setItem(STORAGE_KEY, serialized);
        setSavedAt(
          new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
        );
      } catch {
        // 保存領域がいっぱい、またはプライベートモードなど。画面の操作は続けられる。
        setSavedAt(null);
      }
    }, SAVE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [input, edits]);

  // 未編集の媒体は入力に合わせて作り直し、編集済みの媒体は手直しを尊重する
  const drafts = useMemo(() => {
    const empty = isInputEmpty(input);
    const result = {} as Record<PlatformId, string>;

    for (const platform of PLATFORMS) {
      const edited = edits[platform.id];
      result[platform.id] =
        edited !== undefined ? edited : empty ? '' : buildDraft(platform.id, input);
    }

    return result;
  }, [input, edits]);

  const handleEditDraft = (platform: PlatformId, next: string) => {
    setEdits((prev) => ({ ...prev, [platform]: next }));
  };

  const handleRegenerate = (platform: PlatformId) => {
    setEdits((prev) => {
      const next = { ...prev };
      delete next[platform];
      return next;
    });
  };

  const handleClear = () => {
    const hasContent = !isInputEmpty(input) || Object.keys(edits).length > 0;
    if (hasContent && !window.confirm('入力した内容と下書きを全部消します。よろしいですか？')) {
      return;
    }

    setInput(EMPTY_INPUT);
    setEdits({});
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // 消せなくても画面上は初期化されている
    }
    setSavedAt(null);
  };

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">SNS下書きメーカー</h1>
        <p className="app__lead">
          営業や施術のあとに、今日あったことを一言書くだけ。
          Instagram・X・LINE公式の下書きが同時にできます。
        </p>
        <p className="app__note">
          入力内容はこのブラウザの中だけに保存されます。どこにも送信されません。
        </p>
      </header>

      <main className="app__main">
        <div className="app__col">
          <PostForm value={input} onChange={setInput} onClear={handleClear} />
        </div>

        <div className="app__col">
          <div className="section-head">
            <h2 className="section-head__title">2. 下書きを直してコピーする</h2>
            <p className="section-head__sub">
              文章はそのまま書き換えられます。直した文はコピーにも保存にも反映されます。
            </p>
          </div>

          {PLATFORMS.map((platform) => (
            <PostPreview
              key={platform.id}
              platform={platform}
              text={drafts[platform.id]}
              isEdited={edits[platform.id] !== undefined}
              onChange={(next) => handleEditDraft(platform.id, next)}
              onRegenerate={() => handleRegenerate(platform.id)}
            />
          ))}
        </div>
      </main>

      <footer className="app__footer">
        <span aria-live="polite">
          {savedAt ? `自動保存しました（${savedAt}）` : '入力すると自動で保存されます'}
        </span>
      </footer>
    </div>
  );
}
