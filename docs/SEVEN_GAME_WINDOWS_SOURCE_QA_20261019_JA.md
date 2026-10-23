# Windowsゲーム7作品：統合ソースQA／スクリーンショット取得

## 対象と段階
この手順の目的は、従来の7つの開発ブランチを直接変更せず、各作品の最新Draft PRのソースをWindows Edgeで確認し、引き継ぎ可能な監査証拠を残すことです。LUCK LABは原本ハッシュ照合まで保留。STRATEGY MARKETの日米版は完全に対象外。

**本手順はソース版の検証であり、MSIXインストール、署名、WACK、Microsoft Store審査の代替ではありません。**

## 現在チェックするブランチ
| ゲーム | QA対象ブランチ |
|---|---|
| 小規模経営 | `qa/seven-game-screen-state-audit-20261019` |
| 中古品店 | `fix/usedshop-restored-report-ui-20261019` |
| 工場検査 | `fix/factory-save-transaction-ui-20261019` |
| 深夜監査室 | `fix/night-audit-save-integrity-20261019` |
| EKIDEN | `qa/ekiden-current-flow-ci-20261019` |
| 引継ぎ室 | `qa/handover-story-ui-ci-20261019` |
| 流動資産 | `fix/liquid-save-backup-ui-20261019` |

### 運用上の注意
- 専用の**別フォルダ**（例：`C:\QA\GamesSource\`）に、対象ブランチのソースを7作品分用意する。既存の開発フォルダにcheckout/reset/clean/pullを強行しない。
- `git status --porcelain`が空であることを確認。作業途中の差分があるリポジトリは変更せず検査を停止する。
- フォルダ名は上記の正式リポジトリ名を使用。GitHubアクセスは通常の自分の権限で行い、認証情報を公開ログ・画面に出さない。
- **Windows/Node.js 22以上/Edge**が必要。新しい有料ソフトやnpmパッケージを購入・導入しない。
- Windows PowerShellで以下を実行する。**パスは実際の作業フォルダに置き換える。**

```powershell
$root = "C:\QA\GamesSource"
$script = Join-Path $root "SmallBusinessSimulator\scripts\run-seven-game-windows-qa.ps1"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script -SourceRoot $root
```

### 何が自動で確認されるか
- ソースのブランチ、HEAD SHA、未コミット変更の有無を記録。
- 各作品の`npm test`を実行し、ログを保存。
- 独立した一時Edgeプロファイルで各タブをクリックし、1280×720と1920×1080をPNG撮影。
- タブ選択と表示パネルの一致・横方向のオーバーフロー・JavaScript例外をJSONに記録。
- 流動資産のみ追加で、実UIからの売買・借入・返済・再読込・セーブバックアップ・破損保存の保護を操作。証拠画面を取得。
- 7作品の結果を`SEVEN_GAME_QA_MANIFEST.json`に集約。テスト失敗や画面不整合はFAILのまま記録し、偽の成功に変えない。

出力先は日時付きの`Downloads\WindowsGamesQA_yyyyMMdd_HHmmss`であり、同名の出力先が存在する場合は上書きを拒否する。**元のローカルセーブやGitHubのコードには一切書き込まない**（ブラウザーは専用一時プロファイルを使用）。

### 自動化していない受入項目
1. 作品ごとの実プレイ状態（小規模経営の入庫後・中古品店の接客中と修理中・工場の出荷後・監査室の判断後・EKIDENレース・引継ぎ室の分岐）を画面で操作・撮影。
2. 倍率100/125/150%、最小ウィンドウでの手動検証。
3. プレイヤーとしての長時間試遊と、セーブのファイル書き出し・ファイル読み込みの実操作（流動資産はブラウザー再起動とバックアップの基本処理のみ自動化）。
4. 最終MSIXのインストール、更新、アンインストール、WACK、Store Identity・権利・画像の照合。

## 完成判定
`npm test`成功でもソーステスト合格にしかならない。Windows Edgeで初期タブが通っても**全ゲーム状態の完成ではない**。ひとつでも不足があれば「該当ゲート未確認／HOLD」と報告する。スクリーンショットの代わりにコンセプト画像を提出しない。

Windowsコード担当は、生成した7作品分の監査JSON・PNG・ログと、各作品の未解決事項を、次回のChatGPT引き継ぎ資料にまとめる。各Draft PRを無確認でmainへマージしない。
