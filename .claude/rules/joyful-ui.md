---
paths:
  - "app/**/*.tsx"
  - "src/components/**/*.tsx"
  - "src/lib/theme.ts"
  - "src/lib/joyfulTheme.ts"
---

# Joyful Wellness UI Rules

- UI参照画像は `design/ui-concepts-joyful/` にある。対象画面のPNGを実装前に確認する。
- 正式なタブは「ホーム」「記録」「中央カメラ」「分析」「マイページ」。画像内の別表記は採用しない。
- 生成画像を背景として貼らない。画像からボタン、グラフ、アイコンを切り抜かない。
- 画像内のサンプル数値をハードコードせず、既存のhooksとstoresから取得する。
- hooks、services、stores、Supabaseのデータ契約をUI都合で破壊しない。
- 共通トークンと `src/components/joyful/` の共通部品を優先し、画面固有の色・角丸・影を増やさない。
- 明るく楽しく継続したくなる表現を使うが、子ども向け・カジノ的・過剰な紙吹雪にはしない。
- 不足や未達を責めない。「次にできる小さな行動」を提示する。
- 44pt以上のタップ領域、十分なコントラスト、VoiceOverラベル、Dynamic Typeを考慮する。
- loading、empty、error、offline、premium-lockの各状態を実装する。
- UI変更後は `npx tsc --noEmit` を実行し、対象画面をiOSまたはAndroidで撮影して参照画像と比較する。
