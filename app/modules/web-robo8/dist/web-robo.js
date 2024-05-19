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
        this.prompt = (_b = init.prompt) !== null && _b !== void 0 ? _b : '';
        this.promptCode = (_c = init.promptCode) !== null && _c !== void 0 ? _c : '';
        this.pageContent = '';
        this.generatedJsCode = '';
    }
    getHtmlByUrl() {
        return __awaiter(this, void 0, void 0, function* () {
            this.browser = yield puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--no-zygote',
                    '--single-process'
                ]
            });
            this.page = yield this.browser.newPage();
            yield this.page.goto(this.url);
            this.pageContent = yield this.page.$eval('*', (el) => el.innerHTML);
        });
    }
    // todo 
    isValid() {
        return true;
    }
    generateJsCodeByGenAi() {
        return __awaiter(this, void 0, void 0, function* () {
            let genAi = new GenAi({
                prompt: this.prompt,
                pageContent: this.pageContent
            });
            this.generatedJsCode = yield genAi.generateJsCode();
        });
    }
    execJsCode() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.page.evaluate((jsCode) => {
                eval(`${jsCode}`);
            }, this.generatedJsCode);
        });
    }
    output() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isValid())
                return {};
            let text = '';
            try {
                // 指定されたURlからHTML取得
                yield this.getHtmlByUrl().catch(value => { throw new Error(value); });
                // AIがプロンプトとHTMLを解析してJSコード生成
                yield this.generateJsCodeByGenAi().catch(value => { throw new Error(value); });
                // 生成されたJSコードを実行
                yield this.execJsCode().catch(value => { throw new Error(value); });
                text = yield this.page.$eval('*', (el) => el.innerText);
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
                        jsCode: this.generatedJsCode
                    }
                });
            }
            return {
                text: text,
                promptCode: this.promptCode,
                jsCode: this.generatedJsCode
            };
        });
    }
}
