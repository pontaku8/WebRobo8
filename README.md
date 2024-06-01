# WebRobo8 API
WebRobo8は生成AIを使用したWeb用のRPAツールです。
生成AIには「Gemini API」を使用します。

# 用意するもの
 - git cloneが実行できる環境。
 - docker-composeが実行できる環境。
 - GOOGLE_API_KEY
 「Gemini API」のGOOGLE_API_KEYは[こちら](https://ai.google.dev/gemini-api/docs/api-key?hl=ja)から取得できます。

# はじめる
「git clone」でコードを取得する。
```
git clone git@github.com:pontaku8/WebRobo8.git
```

「.env」ファイルを編集する。取得したGOOGLE_API_KEYを指定する。
```
GOOGLE_API_KEY="...." -> GOOGLE_API_KEY="abcd"
```
「docker-compose up」で起動する。
```
docker-compose up
```
ロボを動かすサンプルページに「sample.json」をプロンプトとして実行する。
サンプルページ、実行コマンド、プロンプトの内容は以下になります。
- サンプルページ
```
http://localhost:3000/sample
```
- 実行コマンド
```
curl -H "Content-Type: application/json" --data @sample.json http://localhost:3000/webrobo8
```
- プロンプト内容
```
- 名前の入力ボックスに「ぽんたく」と入力する
- 電話番号の入力ボックスに「090000000」と入力する
- こちらのリンクをクリックする
```

実行コマンドのレスポンスからロボIDを取得する。
```
{"message":"OK","data":[{"id":"1"}]}
```
ロボIDを指定して、サンプルページのロボ動作後のテキストを取得する。
```
curl -v http://localhost:3000/webrobo8/1

{"message": "OK","data": [{"id": "5", "status": "done","outputData":
続く...
```
- ロボ動作前のサンプルページのテキスト。
```
こちら
名前
電話番号
```
- ロボ動作後のサンプルページのテキスト。(ロボが動いたことが確認できます)
```
こちら
名前
電話番号
ぽんたく
090000000
```

## エンドポイント一覧
```shell
GET /webrobo8
GET /webrobo8/{id}
POST /webrobo8
DELETE /webrobo8
DELETE /webrobo8/{id}
```

## ロボ動作結果一覧を取得する
エンドポイント
```shell
GET /webrobo8
```
リクエストの例
```shell
curl -X GET http://localhost:3000/webrobo8
```
### レスポンス
レスポンス例
```json
{
   "message": "OK",
   "data": [
    {
      "id": "1",
      "status": "done",
      "outputData": [
        {
          "text": "名前 \n電話番号 \nあかさか 090000000\n送信",
          "jsCode": "\n// 名前を入力ボックスに設定\ndocument.querySelector('.test-name')....続く"
        },
        {
          "text": "性別 男性 女性\n生年月日 \n2024\n2023\n2022\n .... 女性 2024331",
          "jsCode": "\ndocument.querySelector('input[name=\"gender\"][value=\"2\"]')...続く"
        }
      ],
    },
    {
      "id": "2",
      "status": "done"
....続く
```
data.*.id: <code style="color:gray">Number</code><br>
ロボID
- - -
data.*.status: <code style="color:gray">String</code><br>
ロボの進行状況
- - -
data. * .outputData. * .text: <code style="color:gray">String</code><br>
ロボの動作後の対象ページのテキスト
- - -
data. * .outputData. * .jsCode: <code style="color:gray">String</code><br>
ロボが実行したjavascriptコード
- - -
message: <code style="color:gray">String</code><br>
リクエスト結果メッセージ
- - -

## ロボ動作結果を取得する
エンドポイント
```shell
GET /webrobo8/{id}
```
リクエストの例
```shell
curl -X GET http://localhost:3000/webrobo8/1
```
### パスパラメータ
- - -
id: <code style="color:gray">Number</code><br>
ロボID
- - -
### レスポンス
レスポンス例
```json
{
   "message": "OK",
   "data": [
      {
        "id": "1",
        "status": "done",
        "outputData": [
          {
            "text": "名前 \n電話番号 \nあかさか 090000000\n送信",
            "jsCode": "\n// 名前を入力ボックスに設定\ndocument.querySelector('.test-name')...続く"
          },
          {
            "text": "性別 男性 女性\n生年月日 ...女性 2024331",
            "jsCode": "\ndocument.querySelector('input[name=\"gender\"][value=\"2\"]')...続く"
          }
        ]
      }
   ]
      
```
data.id: <code style="color:gray">Number</code><br>
ロボID
- - -
data.status: <code style="color:gray">String</code><br>
ロボの進行状況
- - -
data.outputData.text: <code style="color:gray">String</code><br>
ロボ動作後の対象ページのテキスト
- - -
data.outputData.jsCode: <code style="color:gray">String</code><br>
ロボが実行したjavascriptコード
- - -
message: <code style="color:gray">String</code><br>
リクエスト結果メッセージ
- - -

## ロボを動かす
エンドポイント
```shell
POST /webrobo8
```
リクエストの例
```shell
curl -X POST -H "Content-Type: application/json" -d "
  {
    "url":"http://localhost:3000/sample", 
    "prompts": [
      { 
        "selector": ".test-a", 
        "to": "browser\&ai",
        "sleepTime": 3,
        "prompt": "- 名前の入力ボックスに「あかさか」と入力する"....続く 
      },
      { 
        "selector": ".test-b",
        "to": "browser\&ai", 
        "sleepTime": 3,
        "prompt": "- 性別のラジオボタンを「女性」"....続く 
      }
    ]
  }" http://localhost:3000/webrobo8
```
### リクエストヘッダー
- - -
Content-Type:<br>
application/json
- - -
### リクエストボディ
- - -
url: <code style="color:gray">String</code><br>
ロボを動かすページのURL
- - -
prompts.*.selector: <code style="color:gray">String</code><br>
ロボ動作対象の要素<br>
※指定なしの場合は全ての要素が対象
- - -
prompts.*.to: <code style="color:gray">String</code><br>
ロボ動作種類<br>
- browser&ai<br>
AIが生成したJSコードをロボが実行
- ai<br>
AIのみ実行
- browser<br>
JSコードをロボが実行<br>
※使用例は、sample.jsonを確認ください。

- - -
prompts.*.sleepTime: <code style="color:gray">Number</code><br>
スリープ時間<br>
※指定なしの場合は0秒
- - -
prompts.*.prompt: <code style="color:gray">String</code><br>
ロボへの指示例<br>
```
 - 名前の入力ボックスに「ぽんたく」と入力する
 - 性別のラジオボタンを「女性」を選択
 - 生年月日「2024/3/31」を選択
```
- - -
### レスポンス
レスポンス例
```json
{
  "message":"OK",
  "data": [
    {
      "id": "1"
    }
  ]
}
```
data.id: <code style="color:gray">String</code><br>
受け付けたロボID
- - -
message: <code style="color:gray">String</code><br>
リクエスト結果メッセージ
- - -

## ロボ動作結果を全て削除する
エンドポイント
```shell
DELETE /webrobo8
```
リクエストの例
```shell
curl -X DELETE http://localhost:3000/webrobo8
```
### レスポンス
レスポンス例
```json
{
  "message":"OK",
}
```
message: <code style="color:gray">String</code><br>
リクエスト結果メッセージ
- - -


## ロボ動作結果を削除する
エンドポイント
```shell
DELETE /webrobo8/{id}
```
リクエストの例
```shell
curl -X DELETE http://localhost:3000/webrobo8/1
```
### パスパラメータ
- - -
id: <code style="color:gray">Number</code><br>
ロボID
- - -

### レスポンス
レスポンス例
```json
{
  "message":"OK",
}
```
message: <code style="color:gray">String</code><br>
リクエスト結果メッセージ
- - -


# ご利用に関して
自由にご利用できますが、バグなどによる損害の責任は負いかねますでご自身の判断でご利用ください。*:smile:*
