# GitHub Actions でテスト開始前に失敗する事象 — 確認記録

2026-10-19 / 最終リリース判定ではない

## 確認できた事実

下記の3作品で、対象ブランチの Actions run は `conclusion=failure`。
しかし run jobs の `steps` が `null`（0件）で、実際の `npm test` を実行した形跡は確認できない。

| 作品 | workflow run | 対象 |
| --- | --- | --- |
| UsedItemShopSimulator | https://github.com/shihuiarenjinba-png/UsedItemShopSimulator/actions/runs/39185570496 | 倉庫価格変更の旧ブランチで発生。現行分岐も同じ性質 |
| FactoryInspectionSimulator | https://github.com/shihuiarenjinba-png/FactoryInspectionSimulator/actions/runs/39182424943 | 工場UI・計算連携 |
| NightOfficeAuditor | https://github.com/shihuiarenjinba-png/NightOfficeAuditor/actions/runs/39182431569 | 監査UI・計算連携 |

ワークフローは `actions/checkout@v4`、`actions/setup-node@v4 (Node 22)`、
`npm test` を使用。ルール上は `feature/**` push で起動。
ログ取得が404になるケースもあるため、`テストそのものの不合格` と断言しないこと。

## Windowsコード担当の作業

1. 自分の作業フォルダを保護し、`git status --short` で未コミット変更を確認する。
2. 対象リポジトリの最新開発ブランチを **別フォルダ** にチェックアウトする。
3. `node --version` で Node 22 か確認、各 repo の `npm test` を実行しログを保存する。
4. GitHub の該当 Run ページで、Workflow 行にあるエラーバナー（支払・上限・リポジトリ設定・runner の割当、ポリシーなど）を確認する。
5. リポジトリの Settings → Actions → General の Actions 許可・実行制限と、必要に応じ組織／アカウントの Actions 使用状況・課金状態を確認する。根拠のない設定変更や有料プラン変更はしない。
6. `workflow_dispatch` で手動実行できるかを確認し、実行前エラーが出る場合は画面の警告メッセージ・実行URLを保存する。
7. Actions runner が動く状態になったら必ず Node 試験を再実行し、合格レポートと対象コミット SHA を保存する。

## 現状の品質判定

- `steps=0` は **テスト未実施**。成功でも失敗でもない。
- 小規模経営では同時期に実際の Node ステップが走り、33/33成功している。これは他作品の合格証明には使えない。
- 個別の簡易 JS モックテストは CI 代替にはならない。
- Windows実機での画面・操作・保存、MSIX、WACK、Store Identity、権利資料が揃うまで提出 HOLD。
- 有料サービス・外部音源・API契約は不要で、依頼も行わない。
