# Joyful Wellness Design Tokens

最初に `src/lib/joyfulTheme.ts` または既存 `src/lib/theme.ts` へ実装し、画面から直接HEX値を参照しないでください。

## Color

```ts
export const joyfulPalette = {
  background: '#FFF9EC',
  surface: '#FFFFFF',
  primary: '#28A86B',
  primaryDark: '#145C43',
  primarySoft: '#DDF3E6',
  apricot: '#FF9D6C',
  lemon: '#FFD85A',
  sky: '#68BCEB',
  berry: '#E8759C',
  ink: '#16362C',
  textSecondary: '#66766F',
  border: '#E9E5D8',
  success: '#28A86B',
  warning: '#F4A340',
  error: '#D85D5D',
};
```

PFCは全画面で統一します。

- Protein: berry
- Fat: lemon / warm amber
- Carbohydrate: sky
- Fiber / vegetables: leaf green

## Spacing

4ptグリッドを使用します。

```ts
export const joyfulSpacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  section: 40,
};
```

## Radius

```ts
export const joyfulRadius = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
  full: 999,
};
```

## Typography

- 大見出し: 30–34、700、lineHeight 38–42
- 画面タイトル: 24–28、700
- カードタイトル: 18–20、600–700
- 本文: 15–16、400–500、lineHeight 22–25
- 補足: 12–13、400–500
- 数値: 28–64、700、tabular numbersを優先
- 日本語は端末のシステムフォントを基本とし、独自フォント導入は別判断にする

## Shadow

- 影はカード階層の補助としてのみ使用
- 不透明度 0.06–0.12、Y 3–8、blur 10–24
- 色付きの強いグローは禁止
- dark modeでは影より境界線とsurface差を使う

## Motion

- 画面遷移: 180–260ms
- タップ縮小: 0.98
- 達成アニメーション: 350–600ms、1回だけ
- 常時ループする装飾アニメーションは禁止
- Reduce Motion設定を尊重する

## Photography and Illustration

- 食事写真は `assets/food-images/` と既存の画像取得フックを優先
- 写真は自然光、明るい木またはニュートラル背景、彩度を上げすぎない
- 生成画面から写真・アイコンを切り抜かない
- アイコンは既存の `@expo/vector-icons` と `react-native-svg` で再構成する
- ガーデンなど固有イラストが必要な場合は、再利用可能な独立アセットとして別途制作する
