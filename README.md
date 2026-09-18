# AddBall

面積1の玉を1〜100個生成し、投げたり傾けたりして遊ぶスマートフォン優先の2D物理ゲームです。玉は衝突時の確率で合体し、壁との衝突時の確率で分裂します。ゲームの詳細な仕様は [`docs/GAME_SPEC.md`](docs/GAME_SPEC.md) を参照してください。

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

Windowsでは **`start-local.bat` をダブルクリック**すると、初回は依存関係をインストールし、開発サーバーとブラウザを起動します（初回はインターネット接続が必要です）。表示された黒いウィンドウを閉じるとサーバーが停止します。起動中は http://127.0.0.1:5173 からアクセスできます。ポート使用中のエラーが出た場合は、前回の起動ウィンドウを閉じてから再実行してください。

摩擦の確認は、START後にメニューで「合体確率」「分裂確率」を0%、「傾き」をOFFにして、摩擦を0より大きく設定し、玉を軽く投げてください。衝突しても全体の運動エネルギーが減り、徐々に静止します。摩擦0では既存の弾性衝突を維持します。傾きONで重力を加えた場合やドラッグ中は、その入力により加速することがあります。

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

`main` ブランチへのpush時は、GitHub Actionsがテストとbuildを実行し、`dist/`だけをGitHub Pagesへ公開します。初回のみリポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定してください。Actionsの「Deploy to GitHub Pages」は手動実行もできます。

## 対応ブラウザ

主な対象は iPhone Safari、Android Chrome、および現行デスクトップ版の Chrome、Safari、Firefox、Edgeです。端末傾き操作はprogressive enhancementとして提供し、対応ブラウザでは常にPointer Eventsによる操作が可能です。

## プライバシーとデータ

AddBallにはアカウント、アクセス解析、トラッキング、広告、外部へのデータ送信がありません。端末の傾き情報がデバイス外へ送られることもありません。傾きとサウンドの設定だけをlocalStorageへ保存し、その他のゲーム状態は一時的なデータとして扱います。

## ライセンス

ソースコードと独自アートワークはMIT Licenseで提供します。詳細は [`LICENSE`](LICENSE) を参照してください。npm依存packageとしてbundleするMatter.jsもMIT Licenseで配布されています。
