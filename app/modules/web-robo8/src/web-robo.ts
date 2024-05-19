import puppeteer from 'puppeteer'
import { GenAi } from './genai.js'
import { RoboError } from './robo-error.js'

export class WebRobo8 
{
  
  url: string
  prompt: string
  pageContent: string
  browser: any
  page: any
  generatedJsCode: string
  promptCode: string
  
  constructor(init :Partial<WebRobo8>) 
  {
    
    this.url = init.url?? ''
    this.prompt = init.prompt?? ''
    this.promptCode = init.promptCode?? ''
    this.pageContent = ''
    this.generatedJsCode = ''

  }

  private async getHtmlByUrl()
  {

    this.browser = await puppeteer.launch(
      {
        headless: 'new',
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox', 
          '--no-zygote', 
          '--single-process'
        ]
      }
    )

    this.page = await this.browser.newPage()
    await this.page.goto(this.url)
    this.pageContent = await this.page.$eval('*', (el: Element) => (el as HTMLElement).innerHTML)
  }

  // todo 
  public isValid(): boolean
  {
    return true
  }

  private async generateJsCodeByGenAi()
  {
    let genAi: GenAi = new GenAi(
      {
        prompt: this.prompt,
        pageContent: this.pageContent
      }
    )
    this.generatedJsCode = await genAi.generateJsCode()
  }

  private async execJsCode()
  {

    await this.page.evaluate((jsCode: string) => 
      { 
        eval(`${jsCode}`);
      }, 
      this.generatedJsCode
    )

  }

  public async output(): Promise<object>
  {
    if (!this.isValid()) return {}

    let text: string = ''
    try 
    {
      // 指定されたURlからHTML取得
      await this.getHtmlByUrl().catch(value => { throw new Error(value) })
      // AIがプロンプトとHTMLを解析してJSコード生成
      await this.generateJsCodeByGenAi().catch(value => { throw new Error(value) })
      // 生成されたJSコードを実行
      await this.execJsCode().catch(value => { throw new Error(value) })
      
      text = await this.page.$eval('*', (el: Element) => (el as HTMLElement).innerText)
      await this.page.close()
      await this.browser.close()
     
    } catch (e: any) 
    {

      await this.page.close()
      await this.browser.close()
      throw new RoboError(
        {
          errors: {
            message: e.message,
            promptCode: this.promptCode,
            jsCode: this.generatedJsCode
          }
        }
      )
    }
    
    return {
      text: text,
      promptCode: this.promptCode,
      jsCode: this.generatedJsCode
    }
  }

}