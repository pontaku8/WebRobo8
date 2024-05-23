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
RPAロボを動かすサンプルページに「sample.json」をプロンプトとして実行する。
サンプルページ、実行コマンド、プロンプトの内容は以下になります。
- サンプルページ
```
http://localhost:3000/sample
```
- 実行コマンド
```
curl -H "Content-Type: application/json" --data @sample.json http://localhost:3000/prompt
```
- プロンプト内容
```
- 名前の入力ボックスに「ぽんたく」と入力する
- 電話番号の入力ボックスに「090000000」と入力する
- こちらのリンクをクリックする
```

実行コマンドのレスポンスからpromptCodeを取得する。
```
[{"status":"success","message":"OK","data":[{"promptCode":"ZrNB13rvDT"}]}]   
```
promptCodeを指定して、サンプルページのRPAロボ動作後のテキストを取得する。
```
curl -v http://localhost:3000/prompt/ZrNB13rvDT

{"status":"done","data":[{"text":"こちら\n名前 \n電話番号 \nぽんたく 090000000"
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

# Prompt API
## エンドポイント一覧
```shell
GET /prompt
GET /prompt/{promptCode}
POST /prompt
DELETE /prompt
```

## プロンプトの実行結果一覧を取得する
エンドポイント
```shell
GET /prompt
```
リクエストの例
```shell
curl -X GET http://localhost:3000/prompt
```
### レスポンス
レスポンス例
```json
[
    {
        "promptCode": "Zxb5rmAoq8",
        "status": "done",
        "data": [
            {
                "text": "名前 \n電話番号 \nあかさか 090000000\n送信",
                "jsCode": "\n// 名前を入力ボックスに設定\ndocument.querySelector('.test-name')....続く"
            },
            {
                "text": "性別 男性 女性\n生年月日 \n2024\n2023\n2022\n .... 女性 2024331",
                "jsCode": "\ndocument.querySelector('input[name=\"gender\"][value=\"2\"]')...続く"
            }
        ],
        "message": "OK"
    },
    {
        "promptCode": "3rjxV7HIsy",
        "status": "done"
....続く
```
promptCode: <code style="color:gray">String</code><br>
プロンプトの識別コード
- - -
status: <code style="color:gray">String</code><br>
プロンプトの進行状況
- - -
data.*.text: <code style="color:gray">String</code><br>
プロンプト実行後の対象ページのテキスト
- - -
data.*.jsCode: <code style="color:gray">String</code><br>
ロボが実行したjavascriptコード
- - -
message: <code style="color:gray">String</code><br>
リクエスト結果メッセージ
- - -

## プロンプトの実行結果を取得する
エンドポイント
```shell
GET /prompt/{promptCode}
```
リクエストの例
```shell
curl -X GET http://localhost:3000/prompt/t77liZeCXW
```
### パスパラメータ
- - -
promptCode: <code style="color:gray">String</code><br>
プロンプトの識別コード
- - -
### レスポンス
レスポンス例
```json
{
    "promptCode": "Zxb5rmAoq8",
    "status": "done",
    "data": [
        {
            "text": "名前 \n電話番号 \nあかさか 090000000\n送信",
            "jsCode": "\n// 名前を入力ボックスに設定\ndocument.querySelector('.test-name')...続く"
        },
        {
            "text": "性別 男性 女性\n生年月日 ...女性 2024331",
            "jsCode": "\ndocument.querySelector('input[name=\"gender\"][value=\"2\"]')...続く"
        }
    ],
    "message": "OK"
}
```
promptCode: <code style="color:gray">String</code><br>
プロンプトの識別コード
- - -
status: <code style="color:gray">String</code><br>
プロンプトの進行状況
- - -
data.*.text: <code style="color:gray">String</code><br>
プロンプト実行後の対象ページのテキスト
- - -
data.*.jsCode: <code style="color:gray">String</code><br>
ロボが実行したjavascriptコード
- - -
message: <code style="color:gray">String</code><br>
リクエスト結果メッセージ
- - -

## プロンプトを実行する
エンドポイント
```shell
POST /prompt
```
リクエストの例
```shell
curl -X POST -H "Content-Type: application/json" -d "
  {
    "url":"http://localhost:3000/sample", 
    "prompts": [
      { 
        "selector": ".test-a", 
        "prompt": "- 名前の入力ボックスに「あかさか」と入力する"....続く 
      },
      { 
        "selector": ".test-b", 
        "prompt": "- 性別のラジオボタンを「女性」"....続く 
      }
    ]
  }" http://localhost:3000/prompt
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
ロボ操作対象の要素<br>
※指定なしの場合は全ての要素が対象
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
  "status":"success",
  "message":"OK",
  "data":[
    {
      "promptCode":"pUQjZgEVsH"
    }
  ]
}
```
status: <code style="color:gray">String</code><br>
プロンプトの進行状況
- - -
data.*.promptCode: <code style="color:gray">String</code><br>
受け付けたプロンプトの識別コード
- - -
message: <code style="color:gray">String</code><br>
リクエスト結果メッセージ
- - -

## プロンプトの実行結果を削除する
エンドポイント
```shell
DELETE /prompt
```
リクエストの例
```shell
curl -X DELETE http://localhost:3000/prompt
```
### レスポンス
レスポンス例
```json
{
  "status":"success",
  "message":"OK",
}
```
status: <code style="color:gray">String</code><br>
プロンプトの進行状況
- - -
message: <code style="color:gray">String</code><br>
リクエスト結果メッセージ
- - -

# ご利用に関して
自由にご利用できますが、バグなどによる損害の責任は負いかねますでご自身の判断でご利用ください。*:smile:*
