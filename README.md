# 食事サポート

食事記録、栄養分析、健康習慣の継続を支援するExpo React Nativeアプリです。現在は「明るく、楽しく、毎日使いたくなる」Joyful Wellness UIへの再構築用ハンドオフを同梱しています。

## Claude Designへの引き継ぎ

最初に以下を順番に読んでください。

1. `CLAUDE.md` — プロジェクト全体の構造と作業ルール
2. `design/ui-concepts-joyful/CLAUDE_SETUP.md` — Claude Codeの初回準備
3. `design/ui-concepts-joyful/README.md` — 26画面の画像と実装先の対応
4. `design/ui-concepts-joyful/TOKENS.md` — 色、余白、角丸、文字、モーション
5. `design/ui-concepts-joyful/IMPLEMENTATION.md` — 実装順と既存ロジックの扱い
6. `design/ui-concepts-joyful/ACCEPTANCE.md` — 完了条件
7. `design/ui-concepts-joyful/PROMPTS.md` — Claude Codeへ渡すプロンプト

参照PNGは完成イメージであり、画像を背景として貼り付けるための素材ではありません。React Nativeのコンポーネントとして再現し、既存のhooks、services、stores、Supabase連携を維持してください。

## ローカル起動

```bash
npm install
cp .env.example .env.local
npm run ios
```

実データが不要なUI作業は、`.env.example` のままモックモードで始められます。実バックエンドを使う場合は、`.env.local` に公開可能なSupabase URLとanon keyを設定してください。秘密鍵とservice-role keyはクライアントに設定しません。

## 検証

```bash
npx tsc --noEmit
```

UI変更はiOSまたはAndroidで対象画面のスクリーンショットも確認してください。
