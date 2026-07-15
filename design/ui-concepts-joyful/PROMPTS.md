# Claude Code Prompts

## 初回分析

```text
/frontend-design

このExpo React Nativeアプリを、design/ui-concepts-joyful/ のJoyful Wellness UIへ段階的に作り直します。

最初はコードを変更せず、以下を読んでください。
- CLAUDE.md
- .claude/rules/joyful-ui.md
- design/ui-concepts-joyful/README.md
- design/ui-concepts-joyful/TOKENS.md
- design/ui-concepts-joyful/IMPLEMENTATION.md
- design/ui-concepts-joyful/ACCEPTANCE.md
- src/lib/theme.ts
- app/(tabs)/_layout.tsx

既存のhooks、services、stores、Supabaseデータ契約を維持する前提で、Phase 0の実装計画、変更対象、再利用コンポーネント、リスクを提示してください。まだコードは変更しないでください。
```

## 画面実装テンプレート

```text
/frontend-design

次の1画面だけを実装してください。

参照画像: design/ui-concepts-joyful/<IMAGE>.png
対象route: <ROUTE>

実装前に、route、関連components、使用hooks、storesを確認してください。

必須条件:
- 既存データ処理とナビゲーションを維持
- PNGを背景画像や切り抜き素材として使わない
- 画像内のサンプル数値をハードコードしない
- 共通Joyful tokens/componentsを再利用
- loading / empty / error / offlineを実装
- VoiceOver、Dynamic Type、44ptタップ領域を考慮
- iPhone SE相当でも横にはみ出さない
- npx tsc --noEmitを実行

完了時に、変更ファイル、参照画像との差分、検証結果、残課題を報告してください。
```

## Visual QA

```text
参照画像と現在の実装スクリーンショットを比較してください。

優先順位:
1. 情報階層
2. 主操作の分かりやすさ
3. 余白とカード密度
4. タイポグラフィ
5. 色と装飾

相違点を具体的に列挙し、既存データ契約を壊さない範囲で修正してください。修正後に型チェックを実行してください。
```

## 禁止事項

```text
- 全26画面を一度に変更しない
- hooks/services/storesをUI都合で全面改変しない
- 生成画像を背景として使用しない
- 生成画像からUI部品を切り抜かない
- 固定サンプル値を本番UIに残さない
- 型エラーを残して次へ進まない
- スクリーンショット比較なしで完成扱いにしない
```
