# Claude Code Setup

## 1. リポジトリを取得する

```bash
git clone https://github.com/hiroakiyasa/food.git
cd food
npm install
cp .env.example .env.local
```

UIだけを作る間は、`.env.local` の `EXPO_PUBLIC_USE_MOCK=true` を維持します。実環境へ接続するときも、クライアントには公開可能なSupabase anon keyだけを設定し、`sb_secret_` やservice-role keyは使用しません。

## 2. Anthropic公式frontend-designプラグインを導入する

Claude Code内で次を実行します。

```text
/plugin marketplace add anthropics/claude-code
/plugin install frontend-design@claude-code-plugins
/reload-plugins
```

`frontend-design` は高品質なフロントエンド実装のためのAnthropic公式プラグインです。インストール後も、このリポジトリ固有の正本は `CLAUDE.md`、`.claude/rules/joyful-ui.md`、このディレクトリの資料とPNGです。

## 3. 最初のClaude Codeセッション

`PROMPTS.md` の「初回分析プロンプト」を渡します。最初のセッションではコードを変更せず、次だけを確認します。

- 26枚と実際のExpo Router画面が1対1で対応しているか
- 既存hooks、services、storesのうち各画面が使用するもの
- 共通化すべきトークンとUI部品
- Phase 0からPhase 4までの作業順

分析結果を確認したら、原則1〜3画面ずつ実装します。各バッチで型チェックと実機スクリーンショットを行ってから次へ進みます。

## 4. 開発コマンド

```bash
npm run ios
npm run android
npx tsc --noEmit
```

Webはネイティブ依存パッケージとの互換性を別途確認し、UIの基準画像はまずiOSまたはAndroidで作成します。
