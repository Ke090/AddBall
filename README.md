# AddBall

30の面積を、投げたり傾けたりして遊ぶスマートフォン優先の2D物理ゲームです。玉は強い正面衝突で合体し、壁へ強くぶつかると分裂します。ゲームの詳細な仕様は [`docs/GAME_SPEC.md`](docs/GAME_SPEC.md) を参照してください。

## 操作方法

- **START**をタップするとゲームを開始し、対応端末では任意のモーションアクセスを許可できます。
- 指またはマウスで玉をドラッグし、離すと投げられます。
- スマートフォンを傾けると重力を操作できます。センサーがなくてもすべてのゲーム操作が可能です。
- メニューから「はじめから」「傾き」「傾きを再調整」「サウンド」を操作できます。

## 使用技術

TypeScript、Vite、HTML/CSS、独自の高DPI対応Canvas renderer、Matter.js（ローカルbundle）、Web Audio API、および独自Service Workerを使用しています。バックエンドや実行時CDN依存はありません。

## ディレクトリ構成

```text
src/main.ts              アプリケーションの起点
src/game/                物理演算、ルール、入力、傾き、音声、描画
src/ui/                  メニューとUI制御
src/styles/main.css      responsive表示
docs/GAME_SPEC.md        ゲーム仕様のsource of truth
public/                  manifest、アイコン、Service Worker
tests/                   unit test
```

## ローカル開発

現行のNode.js LTSが必要です。

```bash
npm install
npm run dev
npm run test
npm run typecheck
npm run lint
npm run build
```

Viteが表示するURLをデスクトップで開くか、同じネットワーク上のスマートフォンからアクセスしてください。端末傾きの権限は通常HTTPSを必要とします（各ブラウザはlocalhostも安全な接続として扱います）。権限要求はSTART操作後にだけ行い、拒否された場合も通常どおりプレイできます。

## 設定とデバッグ

ゲームバランス値は `src/game/config.ts` に集約しています。URLへ `?debug=1` を追加すると、FPS、面積保存、重力、衝突thresholdを確認する開発用HUDを表示します。通常の公開URLではデバッグUIを表示しません。

## PWAと公開方法

`npm run build` が生成する `dist/` を任意の静的ホスティングへ配置できます。ドメイン直下だけでなく、GitHub Pagesなどのサブパスにも配置できます。HTTPSを有効にしてください。同梱のmanifestとバージョン付きService Workerにより、ホーム画面への追加とapplication shellのoffline cacheに対応します。shellのファイル構成やcache処理を変更した場合は、cache versionも更新してください。ソースリポジトリのルートではなく、必ずbuild後の `dist/` の内容を公開してください。

## Pull Requestのコンフリクト解消

GitHubでコンフリクトが表示された場合は、PRのブランチへ最新の`main`を取り込み、ファイルごとに両方の変更を確認して解消してください。`ours`または`theirs`を一括適用すると、ゲーム本体や公開設定の変更を失う可能性があります。

```bash
git fetch origin
git switch <PRのブランチ名>
git merge origin/main
# <<<<<<<、=======、>>>>>>> を取り除き、必要な内容を残す
git add <解消したファイル>
git commit
git push origin <PRのブランチ名>
```

`main`以外を公開元ブランチにしている場合は、`origin/main`をそのブランチ名へ置き換えてください。解消後は `git diff --check`、`npm run test`、`npm run build` を実行してからpushします。

## 対応ブラウザ

主な対象は iPhone Safari、Android Chrome、および現行デスクトップ版の Chrome、Safari、Firefox、Edgeです。端末傾き操作はprogressive enhancementとして提供し、対応ブラウザでは常にPointer Eventsによる操作が可能です。

## プライバシーとデータ

AddBallにはアカウント、アクセス解析、トラッキング、広告、外部へのデータ送信がありません。端末の傾き情報がデバイス外へ送られることもありません。傾きとサウンドの設定だけをlocalStorageへ保存し、その他のゲーム状態は一時的なデータとして扱います。

## ライセンス

ソースコードと独自アートワークはMIT Licenseで提供します。詳細は [`LICENSE`](LICENSE) を参照してください。npm依存packageとしてbundleするMatter.jsもMIT Licenseで配布されています。
