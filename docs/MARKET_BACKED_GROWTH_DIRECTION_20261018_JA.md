# SmallBusinessSimulator — オフライン店舗経営ゲームの市場根拠と優先作業
調査日: 2026-10-18

## 参考事実
- Supermarket Simulator（Nokta Games）: 2026-10-12のSteamDB記録で約84,000レビュー、約91%好評。https://steamdb.info/app/2670630/info/
- Big Ambitions: SteamDB 2026-10-05記録で約14,000レビュー。https://steamdb.info/app/1331550/
- TCG Card Shop Simulator: Video Game Insights推計販売約300万本。**推定値であり公表実数ではない。** https://app.sensortower.com/vgi/game/tcg-card-shop-simulator
- 別のTrading Card Shop Simulatorには推計752本/45.7%好評という反例がある。https://app.sensortower.com/vgi/game/trading-card-shop-simulator

## 実装優先仮説
**プレイヤーが経営成長を感じられること**を優先し、ただ数字を増やすだけでなく店の変化を見せる。
1. 小さな初期店舗から、売場の拡大/新商品ライン/人員/資金繰りに成長の分岐を作る。
2. 営業結果は「今回の一手→売れた/売れない理由→次の選択」が一画面で追えるようにする。
3. 成長ミッション・周年イベントで中長期プレイに明確な達成目標を設定する。
4. 初期の3ステップ「方針→運営→結果」は変えない。深い設定は閉じ、目標は一行で表示する。

## 禁止する飛躍
大ヒット例のような3D没入感をソースだけで備えたとは言わない。Steamのレビュー・推計販売を本作のMicrosoft Store売上予測に使わない。名称・MSIX・Windows実機・価格・素材権利は別工程として検査する。