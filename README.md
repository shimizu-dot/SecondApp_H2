# Freezer App

買い物メモと冷蔵庫在庫を1つの画面で管理できる、Spring Boot + Thymeleaf のWebアプリです。  
予算管理、時計表示、テーマ切替、H2データベースへのスナップショット保存に対応しています。

## 主な機能

- 買い物リストの一括入力（1行1アイテム）
- 買い物リストから冷蔵庫リストへの移動
- 冷蔵庫内の同名アイテム重複チェック（確認ダイアログ）
- 予算 / 出費 / 残金のリアルタイム表示
- 日付表示、デジタル時計、アナログ時計
- テーマ切替（スタイリッシュ / ナチュラル / モノクロ）
- 画面状態のDB保存・復元（`/api/snapshot`）

## 技術スタック

- Java 21
- Spring Boot 4.0.6
- Spring MVC + Thymeleaf
- H2 Database
- Maven Wrapper (`mvnw`, `mvnw.cmd`)

## 画面

- `/` : メイン画面（`index.html`）
- `/send` : 受信データ表示用画面（`send.html`）

## API

### `GET /api/snapshot`

- 保存済みスナップショットを取得
- 未保存時は `204 No Content`

### `PUT /api/snapshot`

- `Content-Type: text/plain`
- リクエスト本文にJSON文字列をそのまま送信
- 保存成功時 `204 No Content`

> スナップショットIDは固定で `main` です。

## データベース

`src/main/resources/schema.sql` で以下テーブルを作成します。

- `app_settings`
- `shopping_items`
- `fridge_items`
- `app_snapshots`

初期データとして `app_settings(id=1, monthly_budget=30000)` を投入します。

## セットアップ

### 1. H2 データベース

デフォルト接続先:

- DB URL: `jdbc:h2:file:./freezer-db`
- ユーザー: `sa`
- パスワード: なし

必要なら環境変数で上書きしてください。

- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`

### 2. アプリ起動

Windows:

```powershell
.\mvnw.cmd spring-boot:run
```

macOS / Linux:

```bash
./mvnw spring-boot:run
```

起動後に `http://localhost:8080` へアクセスします。

## テスト

```powershell
.\mvnw.cmd test
```

オートパイロット実施結果:

- [autopilot-test-report.md](c:/Projects/SecondApps/docs/autopilot-test-report.md)

## Render (Docker) デプロイ

このプロジェクトは `Dockerfile` と `render.yaml` を同梱しており、Render の Docker Web Service としてデプロイできます。

1. Render で `New +` → `Blueprint` を選択し、このリポジトリを接続
2. `render.yaml` を読み込んで Web Service を作成
3. `DB_URL` などの環境変数は不要です。標準設定の H2 データベースをそのまま使います。
4. デプロイ後、`/` にアクセスして動作確認

補足:

- `Dockerfile` 内で `chmod +x ./mvnw` を実行し、Linux環境の権限エラーを回避
- `server.port` は Render 想定で `10000` 固定
- `spring.sql.init.mode=always` により起動時に `schema.sql` を適用

## ディレクトリ構成（主要）

```text
src/main/java/com/example/freezer/
  controller/
    PageController.java
    SnapshotController.java
  service/
    SnapshotService.java
  FreezerApplication.java

src/main/resources/
  static/
    script.js
    style.css
  templates/
    index.html
    send.html
  application.properties
  schema.sql
```

## 設定ファイル

- `src/main/resources/application.properties`
  - `spring.datasource.*`
  - `spring.sql.init.mode=always`

## 補足

- フロント側テーマ選択は `localStorage`（キー: `freezer_theme`）に保存されます。
- `send.html` の戻るリンクは現在 `model.html` を指しています（必要に応じて修正してください）。
