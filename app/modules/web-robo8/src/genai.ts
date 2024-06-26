
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"

export class GenAi
{
  prompt: string
  genai: ChatGoogleGenerativeAI
  generated: string

  constructor(init :Partial<GenAi>) 
  {
    this.prompt = init.prompt ?? ''
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
          ${this.prompt}
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
    return this.generated 
  }

}