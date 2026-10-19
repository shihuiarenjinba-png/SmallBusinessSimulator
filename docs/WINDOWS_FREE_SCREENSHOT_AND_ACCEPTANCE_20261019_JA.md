# Windows 7作品・無料UI画面取得と実機受入（2026-10-19）

## 対象と原本保護
- SmallBusinessSimulator：`feature/qa-save-safe-20261019`
- UsedItemShopSimulator：`feature/long-play-acceptance-20261019`
- FactoryInspectionSimulator：`feature/result-scene-state-20261019`
- NightOfficeAuditor：`feature/ui-calculation-consistency-20261019`
- game-stadium（EKIDEN MANAGER）：`feature/race-to-training-flow-20261019`
- game-new（引継ぎ室）：`feature/story-focus-tabs-20261019`
- finance-simulation：`feature/context-aware-free-ui-20261019`

STRATEGY MARKETは引き渡し済みのため対象外。LUCK LABは原本整合性が解決するまで改変しない。

## 料金と必要環境
- 追加の有料ソフト、画像購入、音楽購入、外部API、クラウドサービス契約は不要。
- WindowsでMicrosoft Edgeがインストールされていることと、Node.js 22以上が必要。
- `scripts/capture-windows-ui.cjs` は外部npmパッケージを利用しない。
- Edgeの一時プロファイルでローカルの `index.html` を開き、各タブをクリックしてPNGを取得。セーブ・販売・借入ボタンは押さない。
- タブの静止画であり、**実際にプレイ中の人物アニメーション、売買、セーブ復元、MSIX動作を証明するものではない。**

## 取得方法（コード担当のWindows PCで実行）
リポジトリは作業を保護した**別のフォルダ**にチェックアウトする。未コミットの変更や既存のZIP、Releaseを削除しない。

例：

```powershell
node --version

node "C:\Source\SmallBusinessSimulator\scripts\capture-windows-ui.cjs" "C:\Source\SmallBusinessSimulator" "C:\QA\Screenshots\SmallBusinessSimulator"
node "C:\Source\SmallBusinessSimulator\scripts\capture-windows-ui.cjs" "C:\Source\UsedItemShopSimulator" "C:\QA\Screenshots\UsedItemShopSimulator"
node "C:\Source\SmallBusinessSimulator\scripts\capture-windows-ui.cjs" "C:\Source\FactoryInspectionSimulator" "C:\QA\Screenshots\FactoryInspectionSimulator"
node "C:\Source\SmallBusinessSimulator\scripts\capture-windows-ui.cjs" "C:\Source\NightOfficeAuditor" "C:\QA\Screenshots\NightOfficeAuditor"
node "C:\Source\SmallBusinessSimulator\scripts\capture-windows-ui.cjs" "C:\Source\game-stadium" "C:\QA\Screenshots\EKIDEN"
node "C:\Source\SmallBusinessSimulator\scripts\capture-windows-ui.cjs" "C:\Source\game-new" "C:\QA\Screenshots\HandoverRoom"
node "C:\Source\SmallBusinessSimulator\scripts\capture-windows-ui.cjs" "C:\Source\finance-simulation" "C:\QA\Screenshots\Portfolio"
```

実際のローカルパスに置き換えて実行する。Microsoft Edgeの場所が標準フォルダにない場合は `$env:EDGE_PATH` に `msedge.exe` の絶対パスを指定。

### 自動取得される画像
1280×720と1920×1080の各タブ画像。画面キャプチャごとに表示領域から左右にはみ出した可能性も記録。最後に `<作品名>_manifest.json` を出力し、エラーと画像名を保存する。

スクリーンショットは一度に**初期タブだけ**を対象にする。ベルトは商品入庫後、修理は作業中、接客は来客中、駅伝はレース中の別途手動撮影が必要。

## 実際の操作で必ず確認すること
1. SmallBusiness：入庫0の日はベルトを隠す。入庫ありでは結果タブに実績数量。賞味期限・割引・7日進行・旧セーブ保持。
2. UsedItemShop：倉庫1/2ページ・値引き仮価格保持・確定後の購入判定・来客処理・閉店スキップ・営業途中セーブ。
3. FactoryInspection：検査率・修理・人員を変えた後の見込み→実績。新規開始・インポート後に旧出荷実績が残らない。
4. NightOfficeAuditor：未調査の段階では答えを示さず、取消時に判定画面を開かない。次案件へ切替。
5. EKIDEN：練習・合同練習→大会→次年度。レース中だけ走者を動かす。8年目は最終結果。
6. 引継ぎ室：物語タブは会話のみを広く表示、手がかりタブでノートを表示。実際に出現した証拠だけが表示される。
7. Portfolio：保有、売買、借入、履歴、収支の一致。実在市場への発注は行わない。

## 受入証拠の最低単位
- GitHubの対象ブランチ／コミットSHAと、実施日時
- `node --test tests/*.test.cjs` の結果ログ
- 各タブ画像・実プレイ状態画像
- セーブ出力→完全終了→再起動→復元、画面倍率変更（100%、125%、150%）
- MSIX実機インストール・起動・保存・アンインストール、WACK合格の記録
- Store提出用の正式Identity、正式LICENSE/第三者NOTICE/商用利用権利の確認

**状態：Windows実機結果・MSIX/WACKは未取得。GitHub sourceテストの成功をStore公開承認に置き換えない。**
