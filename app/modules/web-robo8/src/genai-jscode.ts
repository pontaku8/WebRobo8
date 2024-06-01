
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"

export class GenAiJsCode 
{
  prompt: string
  pageContent: string
  genai: ChatGoogleGenerativeAI
  generated: string

  constructor(init :Partial<GenAiJsCode>) 
  {
    this.prompt = init.prompt ?? ''
    this.pageContent = init.pageContent ?? ''
    this.genai = new ChatGoogleGenerativeAI(
      {
        model: 'gemini-pro',
        maxOutputTokens: 2048,
      }
    )
    this.generated = ''
  }

  private async invoke()
  {
    const res = await this.genai.invoke(
      [
        [
          'human',
          `
          コンテンツのHTMLを解析して、操作のjavascriptコードを上から順に生成してください。※javascriptコードのみ生成
          [操作]
          ${this.prompt}
          [コンテンツ]
          ${this.pageContent}
          `,
        ],
      ]
    )
    this.generated = (res.content as string)
  }

  // todo 
  public isValid(): boolean
  {
    return true
  }

  public async generate()
  {
    if (!this.isValid()) return ''
    
    await this.invoke()
    this.generated = this.generated.replace("```", "")
    this.generated = this.generated.replace("javascript", "")
    this.generated = this.generated.replace("```", "")
  
    return this.generated 
  }

}