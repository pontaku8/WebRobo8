var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import puppeteer from 'puppeteer';
import { GenAiJsCode } from './genai-jscode.js';
import { GenAi } from './genai.js';
import { RoboError } from './robo-error.js';
export class WebRobo8 {
    constructor(init) {
        var _a, _b, _c;
        this.PROMPT_TO_BROWSER_AI = 'browser&ai';
        this.PROMPT_TO_BROWSER = 'browser';
        this.PROMPT_TO_AI = 'ai';
        this.url = (_a = init.url) !== null && _a !== void 0 ? _a : '';
        this.prompts = (_b = init.prompts) !== null && _b !== void 0 ? _b : [];
        this.id = (_c = init.id) !== null && _c !== void 0 ? _c : 0;
        this.jsCode = '';
        this.webRobo8Close = false;
        this.outputData = {
            id: this.id,
            data: []
        };
        this.prompts = this.prompts.map(prompt => {
            if (!prompt.selector)
                prompt.selector = '*';
            if (!prompt.sleepTime)
                prompt.sleepTime = 0;
            if (!prompt.to)
                prompt.to = this.PROMPT_TO_BROWSER_AI;
            if (!prompt.outputSelector)
                prompt.outputSelector = '*';
            return prompt;
        });
    }
    createBrowser() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--no-zygote',
                    '--single-process'
                ]
            });
        });
    }
    createPage() {
        return __awaiter(this, void 0, void 0, function* () {
            let page = yield this.browser.newPage();
            yield page.goto(this.url);
            return page;
        });
    }
    // todo 
    isValid() {
        return true;
    }
    generateJsCodeByGenAi(prompt, targetElem) {
        return __awaiter(this, void 0, void 0, function* () {
            let genAiJsCode = new GenAiJsCode({
                prompt: prompt,
                pageContent: targetElem
            });
            return yield genAiJsCode.generate();
        });
    }
    execJsCode() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.page.evaluate((jsCode) => {
                eval(`${jsCode}`);
            }, this.jsCode);
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.webRobo8Close)
                return;
            yield this.page.close();
            yield this.browser.close();
            this.webRobo8Close = true;
        });
    }
    execBroserAi(prompt) {
        return __awaiter(this, void 0, void 0, function* () {
            let targetElem = '';
            // 操作対象のHTML要素取得
            targetElem = yield this.page.$eval(prompt.selector, (el) => el.innerHTML);
            // HTNLとプロンプトからAIがjavascriptコードを生成
            this.jsCode = yield this.generateJsCodeByGenAi(prompt.prompt, targetElem).catch(value => { throw new Error(value); });
            // 生成されたコードを実行
            yield this.execJsCode().catch(value => { throw new Error(value); });
        });
    }
    execAi(prompt) {
        return __awaiter(this, void 0, void 0, function* () {
            const regexp = /\[prompt(\d{1,})\]/g;
            let promptToAi = prompt.prompt;
            let match;
            let matches = [];
            while ((match = regexp.exec(promptToAi)) !== null) {
                matches.push(match[1]);
            }
            matches.forEach((promptNo) => {
                let index = parseInt(promptNo) - 1;
                if (typeof this.outputData.data[index] !== "undefined") {
                    promptToAi = promptToAi.replace("[prompt" + promptNo + "]", this.outputData.data[index].text);
                }
            });
            let genAi = new GenAi({
                prompt: promptToAi
            });
            let text = yield genAi.generate();
            return text;
        });
    }
    output() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isValid())
                return {};
            try {
                this.browser = yield this.createBrowser().catch(value => { throw new Error(value); });
                this.page = yield this.createPage().catch(value => { throw new Error(value); });
                for (let i = 0; i < this.prompts.length; i++) {
                    if (this.prompts[i].to != this.PROMPT_TO_BROWSER_AI
                        && this.prompts[i].to != this.PROMPT_TO_AI
                        && this.prompts[i].to != this.PROMPT_TO_BROWSER)
                        throw new Error('invalid prompt.to');
                    let text = "";
                    this.jsCode = "";
                    if (this.prompts[i].to == this.PROMPT_TO_BROWSER_AI) {
                        yield this.execBroserAi(this.prompts[i]).catch(value => { throw new Error(value); });
                        yield this.sleep(this.prompts[i].sleepTime * 1000);
                        text = yield this.page.$eval(this.prompts[i].outputSelector, (el) => el.innerText);
                    }
                    if (this.prompts[i].to == this.PROMPT_TO_AI) {
                        text = yield this.execAi(this.prompts[i]).catch(value => { throw new Error(value); });
                    }
                    if (this.prompts[i].to == this.PROMPT_TO_BROWSER) {
                        this.jsCode = this.prompts[i].prompt;
                        yield this.execJsCode().catch(value => { throw new Error(value); });
                        this.sleep(this.prompts[i].sleepTime * 1000);
                        text = yield this.page.$eval(this.prompts[i].outputSelector, (el) => el.innerText);
                    }
                    this.outputData.data[i] =
                        {
                            text: text,
                            jsCode: this.jsCode
                        };
                    this.jsCode = '';
                    if (this.webRobo8Close)
                        throw new Error('closed webrobo8');
                }
                yield this.close();
            }
            catch (e) {
                yield this.close();
                throw new RoboError({
                    errors: {
                        message: e.message,
                        id: this.id,
                        jsCode: this.jsCode
                    }
                });
            }
            return this.outputData;
        });
    }
    sleep(time) {
        return new Promise((p) => setTimeout(p, time));
    }
}
