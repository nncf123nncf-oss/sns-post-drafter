import type { ChangeEvent } from 'react';
import { TONES, type PostInput, type ToneId } from '../types/post';
import { countCharacters } from '../utils/characterCount';

interface PostFormProps {
  value: PostInput;
  onChange: (next: PostInput) => void;
  onClear: () => void;
}

/**
 * 入力フォーム。
 * 必須は「今日の出来事」だけにして、疲れているときでも1項目で終われるようにしている。
 */
export function PostForm({ value, onChange, onClear }: PostFormProps) {
  const update = <K extends keyof PostInput>(key: K, next: PostInput[K]) => {
    onChange({ ...value, [key]: next });
  };

  const handleText =
    (key: Exclude<keyof PostInput, 'tone'>) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      update(key, event.target.value);
    };

  return (
    <section className="card form" aria-labelledby="form-heading">
      <div className="card__head">
        <h2 id="form-heading" className="card__title">
          1. 今日のことを書く
        </h2>
        <button type="button" className="btn btn--ghost" onClick={onClear}>
          全部消す
        </button>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="todayEvent">
          今日の出来事
          <span className="field__badge">まずはここだけでOK</span>
        </label>
        <p className="field__hint">
          うまく書こうとしなくて大丈夫です。話し言葉のままで構いません。
        </p>
        <textarea
          id="todayEvent"
          className="input input--area"
          rows={4}
          placeholder="例）常連さんに「肩が軽くなった」と言ってもらえた。3ヶ月通ってくれている方です。"
          value={value.todayEvent}
          onChange={handleText('todayEvent')}
        />
        <p className="field__count">{countCharacters(value.todayEvent)}文字</p>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="service">
          商品・サービス
        </label>
        <input
          id="service"
          className="input"
          type="text"
          placeholder="例）肩こり専門の整体（60分）"
          value={value.service}
          onChange={handleText('service')}
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="audience">
          伝えたい相手
        </label>
        <input
          id="audience"
          className="input"
          type="text"
          placeholder="例）デスクワークで肩がつらい40代の方"
          value={value.audience}
          onChange={handleText('audience')}
        />
      </div>

      <fieldset className="field field--fieldset">
        <legend className="field__label">投稿の雰囲気</legend>
        <div className="tones" role="radiogroup" aria-label="投稿の雰囲気">
          {TONES.map((tone) => (
            <label
              key={tone.id}
              className={`tone ${value.tone === tone.id ? 'tone--active' : ''}`}
            >
              <input
                className="tone__radio"
                type="radio"
                name="tone"
                value={tone.id}
                checked={value.tone === tone.id}
                onChange={() => update('tone', tone.id as ToneId)}
              />
              <span className="tone__label">{tone.label}</span>
              <span className="tone__hint">{tone.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label className="field__label" htmlFor="announcement">
          お知らせ
        </label>
        <p className="field__hint">休業日・キャンペーン・空き枠など、伝えたい連絡事項。</p>
        <textarea
          id="announcement"
          className="input input--area"
          rows={3}
          placeholder="例）今週の金曜は14時と16時に空きがあります。"
          value={value.announcement}
          onChange={handleText('announcement')}
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="hashtags">
          ハッシュタグ
        </label>
        <p className="field__hint">
          スペースか読点で区切ってください。「#」はあってもなくても大丈夫です。LINEでは使いません。
        </p>
        <input
          id="hashtags"
          className="input"
          type="text"
          placeholder="例）整体 肩こり 名古屋"
          value={value.hashtags}
          onChange={handleText('hashtags')}
        />
      </div>
    </section>
  );
}
