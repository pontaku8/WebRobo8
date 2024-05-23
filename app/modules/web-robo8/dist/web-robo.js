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
import { GenAi } from './genai.js';
import { RoboError } from './robo-error.js';
export class WebRobo8 {
    constructor(init) {
        var _a, _b, _c;
        this.url = (_a = init.url) !== null && _a !== void 0 ? _a : '';
        this.prompts = (_b = init.prompts) !== null && _b !== void 0 ? _b : [];
        this.promptCode = (_c = init.promptCode) !== null && _c !== void 0 ? _c : '';
        this.prompts = this.prompts.map(v => {
            if (!v.selector)
                v.selector = '*';
            return v;
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
            let genAi = new GenAi({
                prompt: prompt,
                pageContent: targetElem
            });
            return yield genAi.generateJsCode();
        });
    }
    execJsCode(jsCode) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.page.evaluate((jsCode) => {
                eval(`${jsCode}`);
            }, jsCode);
        });
    }
    output() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isValid())
                return {};
            let targetElem = '';
            let jsCode = '';
            let output = {
                promptCode: this.promptCode,
                data: []
            };
            try {
                this.browser = yield this.createBrowser().catch(value => { throw new Error(value); });
                this.page = yield this.createPage().catch(value => { throw new Error(value); });
                for (let i = 0; i < this.prompts.length; i++) {
                    // 操作対象のHTML要素取得
                    targetElem = yield this.page.$eval(this.prompts[i].selector, (el) => el.innerHTML);
                    // HTNLとプロンプトからAIがjavascriptコードを生成
                    jsCode = yield this.generateJsCodeByGenAi(this.prompts[i].prompt, targetElem).catch(value => { throw new Error(value); });
                    // 生成されたコードを実行
                    yield this.execJsCode(jsCode).catch(value => { throw new Error(value); });
                    output.data[i] = {
                        text: yield this.page.$eval(this.prompts[i].selector, (el) => el.innerText),
                        jsCode: jsCode
                    };
                    targetElem = '';
                    jsCode = '';
                }
                yield this.page.close();
                yield this.browser.close();
            }
            catch (e) {
                yield this.page.close();
                yield this.browser.close();
                throw new RoboError({
                    errors: {
                        message: e.message,
                        promptCode: this.promptCode,
                        jsCode: jsCode
                    }
                });
            }
            return output;
        });
    }
}
