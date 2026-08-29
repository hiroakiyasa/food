# P0〜P2 Nutrition Coach

2026-07-16時点で、毎日の食事記録を中心にしたP0〜P2を実装済みです。

## 実装範囲

- オフライン優先の食事保存とSupabase双方向同期
- 端末間の更新・削除伝播、失敗キューの自動再試行
- 非公開Storageと署名URLによる食事画像表示
- 写真解析の信頼度、量・カロリー範囲、推定根拠、隠れ塩分の表示
- 汁物の摂取量、ご飯の茶碗サイズなど日本食向け確認UI
- 写真、バーコード、食品検索、AI会話、昨日と同じ食事の再利用
- 摂取量と体重推移から提案する適応型エネルギー目標
- 次の一食に絞った栄養提案、空腹度、行動チェック
- URLのRecipe JSON-LDを取り込む認証必須Edge Function
- 解析成功率・訂正・受諾を保存する計測イベント

## データとプライバシー

マイグレーションは `supabase/migrations/20260716062140_nutrition_coach_p0_p2.sql`。
ユーザー由来の新規テーブルはすべてRLSを有効にし、本人の行だけを読み書きできます。
`meal-images` は非公開で、`<user-id>/...` 配下だけを本人が操作できます。

レシピ取り込みはJWT必須です。Edge Functionはプライベート・ループバックIP、
資格情報を含むURL、過大レスポンスを拒否し、タイムアウトを設定しています。

## 推定値の扱い

写真から得た栄養値は確定値ではありません。画面では代表値だけでなく範囲と
確認事項を示し、ユーザーが量や汁の摂取率を修正できます。医療判断には使用せず、
疾患管理が必要な場合は専門家の判断を優先します。

## 検証

```bash
npm run typecheck
npm test
npx expo export --platform web --output-dir /tmp/food-web-export
```

Supabaseへ反映後は、各テーブルのRLSとポリシー、Storageの非公開設定、
Security Advisor / Performance Advisorを確認してください。
