import puppeteer from 'puppeteer'
import { GenAi } from './genai.js'
import { RoboError } from './robo-error.js'

export class WebRobo8 
{
  
  url: string
  prompts: {
    selector: string,
    prompt: string,
  }[]
  browser: any
  page: any
  promptCode: string
  
  constructor(init :Partial<WebRobo8>) 
  {
    
    this.url = init.url?? ''
    this.prompts = init.prompts?? []
    this.promptCode = init.promptCode?? ''
    
    this.prompts = this.prompts.map(v => 
    {
      if (!v.selector) v.selector = '*'
      return v
    })

  }

  private async createBrowser()
  {
    return await puppeteer.launch(
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
  }

  private async createPage()
  {
    let page = await this.browser.newPage()
    await page.goto(this.url)
  
    return page
  }

  // todo 
  public isValid(): boolean
  {
    return true
  }

  private async generateJsCodeByGenAi(prompt: string, targetElem: string)
  {
    let genAi: GenAi = new GenAi(
      {
        prompt: prompt,
        pageContent: targetElem
      }
    )
    return await genAi.generateJsCode()
  }

  private async execJsCode(jsCode: string)
  {

    await this.page.evaluate((jsCode: string) => 
      { 
        eval(`${jsCode}`);
      }, 
      jsCode
    )

  }

  public async output(): Promise<object>
  {
    if (!this.isValid()) return {}

    let targetElem: string = ''
    let jsCode: string = ''

    let output: {
      promptCode: string,
      data: {
        text: string,
        jsCode: string
      }[]
    } = {
      promptCode: this.promptCode,
      data: []
    }

    try 
    {

      this.browser = await this.createBrowser().catch(value => { throw new Error(value) })
      this.page = await this.createPage().catch(value => { throw new Error(value) })

      for(let i = 0; i < this.prompts.length; i++) 
      {
        // 操作対象のHTML要素取得
        targetElem = await this.page.$eval(this.prompts[i].selector, (el: Element) => (el as HTMLElement).innerHTML)
        // HTNLとプロンプトからAIがjavascriptコードを生成
        jsCode = await this.generateJsCodeByGenAi(this.prompts[i].prompt, targetElem).catch(value => { throw new Error(value) })
        // 生成されたコードを実行
        await this.execJsCode(jsCode).catch(value => { throw new Error(value) })
        output.data[i] = {
          text: await this.page.$eval(this.prompts[i].selector, (el: Element) => (el as HTMLElement).innerText),
          jsCode: jsCode
        }
        targetElem = ''
        jsCode = ''
      }
    
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
            jsCode: jsCode
          }
        }
      )
    }
    
    return output
  }

}