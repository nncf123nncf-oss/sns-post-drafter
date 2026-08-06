# SNS下書きメーカー

小規模事業者向けの、SNS投稿の下書きを作る道具。

## 解決する困りごと

営業や施術のあとに投稿を考える時間がなく、投稿が後回しになってしまう。
「今日あったこと」を一言書けば、Instagram・X・LINE公式の3媒体ぶんの下書きが同時にできる。

## 使い方

1. 「今日の出来事」を書く（ここだけでも下書きになる）
2. 必要なら 商品・サービス／伝えたい相手／投稿の雰囲気／お知らせ／ハッシュタグ を足す
3. 右側の下書きをそのまま手直しする
4. 「この文をコピー」で貼り付ける

入力は打つそばから自動保存されるので、途中で接客が入っても続きから戻れる。

## 設計上の決めごと

- **AIやAPIは使わない。** 文章はすべて `src/utils/postTemplates.ts` のテンプレートで組み立てる。APIキーは持たず、通信も発生しない。
- **入力は外に出さない。** 保存先は `localStorage`（キー: `sns-post-drafter:v1`）だけ。
- **表示は安全に。** 本文はReactのテキストノードと `<textarea>` の値としてのみ描画し、HTMLとして解釈しない（`dangerouslySetInnerHTML` は不使用）。
- **文字数の数え方**（`src/utils/characterCount.ts`）
  - Instagram: 2200文字 / LINE公式: 500文字 → 見た目どおりの文字数（絵文字は1文字）
  - X: 140文字 → Xの数え方に合わせ、日本語1文字＝2・半角1文字＝1として全角換算。上限に収まるよう「今日の出来事」を自動で切り詰める。
- **手直しの優先。** 下書きを1文字でも直すと、その媒体は自動更新を止める。「入力から作り直す」で元に戻せる。

## ファイル構成

```
src/
├── types/post.ts              入力の型・媒体と雰囲気の定義
├── components/PostForm.tsx    入力フォーム
├── components/PostPreview.tsx 下書き1件（編集・文字数・コピー）
├── utils/postTemplates.ts     媒体別テンプレート
├── utils/characterCount.ts    文字数の数え方
└── App.tsx                    状態管理・localStorage
```

## 開発

```bash
npm install
npm run dev
```

```bash
npm run build
```
