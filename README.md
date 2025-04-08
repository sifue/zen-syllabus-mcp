# ZEN大学シラバスMCP実装 

[ZEN大学シラバス](https://syllabus.zen.ac.jp/)のコンテンツを利用できるようMCPを実装したもの。

## 使い方

Node.jsのバージョンは16以上を使用すること。

```
npx txc
```

でビルド。Macは実行権限をつける。 `chmod 755 build/index.js`

## Claude Desktopでの設定

```
code $env:AppData\Claude\claude_desktop_config.json
```
で設定ファイルを開く。

以下のように設定。

```
{
  "mcpServers": {
      "get-subjects": {
          "command": "node",
          "args": [
              "C:\\Users\\sifue\\workspace\\zen-syllabus-mcp\\build\\index.js"
          ]
      }
  }
}
```

設定後はClaude Desktopを再起動。

「ZEN大学のシラバスMCPを利用してフロントエンドエンジニアになるためのオススメの科目を各学年ごとにあげてください」

で検証。

![Claude Desktop](image/claude.png)

## VSCodeの設定
【未検証】いずれGitHub Copilot でAIエージェントが利用できるようなると利用できるらしい(現在はプレビュー版のみ)。
mcpで設定を検索して以下をsetting.jsonに設定。パスは適宜変更すること。jsonのweatherの上に起動ボタンが現れるので起動しておく。

```json
{
  "mcpServers": {
      "get-subjects": {
          "command": "node",
          "args": [
              "C:\\Users\\sifue\\workspace\\zen-syllabus-mcp\\build\\index.js"
          ]
      }
  }
}
```

設定後はGitHub Copilotで

「ZEN大学のシラバスMCPを利用してフロントエンドエンジニアになるためのオススメの科目を各学年ごとにあげてください」

で検証。東京の天気は調べられないので要注意。

## 動作確認
詳しくは、[TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)のClientの実装を参照。

```
node build/index.js
```
でサーバーを起動。

```
node .\build\client.js
```
でクライアントを起動して実行。

クライアントは検証したいコードに合わせて書き換え、その後、
```
npx txc
```
でビルドして再度クライアントを実行する


## 参考
- [MCPのQuickStart](https://modelcontextprotocol.io/quickstart/server)
- [VSCodeのMCP設定](https://code.visualstudio.com/docs/copilot/chat/mcp-servers)