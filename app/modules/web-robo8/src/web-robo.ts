import puppeteer from 'puppeteer'
import { GenAiJsCode } from './genai-jscode.js'
import { GenAi } from './genai.js'
import { RoboError } from './robo-error.js'


interface Output {
  id: number,
  data: {
    text: string,
    jsCode: string
  }[]
}

export class WebRobo8 
{
  url: string
  prompts: {
    selector: string,
    prompt: string,
    sleepTime: number,
    to: string,
    outputSelector: string
  }[]
  browser: any
  page: any
  id: number
  jsCode: string
  outputData: Output

  PROMPT_TO_BROWSER_AI: string = 'browser&ai'
  PROMPT_TO_BROWSER: string = 'browser'
  PROMPT_TO_AI: string = 'ai'
  
  constructor(init :Partial<WebRobo8>) 
  {
    this.url = init.url?? ''
    this.prompts = init.prompts?? []
    this.id = init.id?? 0
    this.jsCode = ''
    this.outputData = {
      id: this.id,
      data: []
    }
    
    this.prompts = this.prompts.map(prompt => 
    {
      if (!prompt.selector) prompt.selector = '*'
      if (!prompt.sleepTime) prompt.sleepTime = 0
      if (!prompt.to) prompt.to = this.PROMPT_TO_BROWSER_AI
      if (!prompt.outputSelector) prompt.outputSelector = '*'

      return prompt
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
    let genAiJsCode: GenAiJsCode = new GenAiJsCode(
      {
        prompt: prompt,
        pageContent: targetElem
      }
    )
    return await genAiJsCode.generate()
  }

  private async execJsCode()
  {

    await this.page.evaluate((jsCode: string) => 
      { 
        eval(`${jsCode}`);
      }, 
      this.jsCode
    )

  }

  private async close()
  {
    await this.page.close()
    await this.browser.close()
  }

  private async execBroserAi(prompt: any)
  {
    
    let targetElem: string = ''
    // 操作対象のHTML要素取得
    targetElem = await this.page.$eval(prompt.selector, (el: Element) => (el as HTMLElement).innerHTML)
    // HTNLとプロンプトからAIがjavascriptコードを生成
    this.jsCode = await this.generateJsCodeByGenAi(prompt.prompt, targetElem).catch(value => { throw new Error(value) })
    // 生成されたコードを実行
    await this.execJsCode().catch(value => { throw new Error(value) })

  }

  private async execAi(prompt: any)
  {
    
    const regexp = /\[prompt(\d{1,})\]/g;
    let promptToAi: string = prompt.prompt
    let match: RegExpExecArray | null;
    let matches: string[] = [];
    while ((match = regexp.exec(promptToAi)) !== null) 
    {
      matches.push(match[1]);
    }

    matches.forEach((promptNo: string) => 
    {
      let index = parseInt(promptNo) - 1
      if (typeof this.outputData.data[index] !== "undefined") {
        promptToAi = promptToAi.replace("[prompt" + promptNo + "]", this.outputData.data[index].text)
      }
    })

    let genAi: GenAi = new GenAi(
      {
        prompt: promptToAi
      }
    )
    let text = await genAi.generate()
    return text
  }


  public async output(): Promise<object>
  {
    if (!this.isValid()) return {}
    
    try 
    {
      this.browser = await this.createBrowser().catch(value => { throw new Error(value) })
      this.page = await this.createPage().catch(value => { throw new Error(value) })

      for (let i = 0; i < this.prompts.length; i++) 
      {
        if (this.prompts[i].to != this.PROMPT_TO_BROWSER_AI 
        &&  this.prompts[i].to != this.PROMPT_TO_AI
        &&  this.prompts[i].to != this.PROMPT_TO_BROWSER) throw new Error('invalid prompt.to')
     
        let text: string = ""
        this.jsCode = ""
        if (this.prompts[i].to == this.PROMPT_TO_BROWSER_AI) 
        {
          await this.execBroserAi(this.prompts[i]).catch(value => { throw new Error(value) })
          await this.sleep(this.prompts[i].sleepTime * 1000)
          text = await this.page.$eval(this.prompts[i].outputSelector, (el: Element) => (el as HTMLElement).innerText)
        }
     
        if (this.prompts[i].to == this.PROMPT_TO_AI) 
        {
          text = await this.execAi(this.prompts[i]).catch(value => { throw new Error(value) })
        }

        if (this.prompts[i].to == this.PROMPT_TO_BROWSER) 
        {
          this.jsCode = this.prompts[i].prompt
          await this.execJsCode().catch(value => { throw new Error(value) })
          this.sleep(this.prompts[i].sleepTime * 1000)
          text = await this.page.$eval(this.prompts[i].outputSelector, (el: Element) => (el as HTMLElement).innerText)
        }

        this.outputData.data[i] = 
        {
          text: text,
          jsCode: this.jsCode
        }
        this.jsCode = ''
      }
    
      await this.close()
     
    } catch (e: any) 
    {
      await this.close()

      throw new RoboError(
        {
          errors: {
            message: e.message,
            id: this.id,
            jsCode: this.jsCode
          }
        }
      )
    }
    return this.outputData
  }

  private sleep(time: number)
  {
    return new Promise((p) => setTimeout(p, time))
  }

}