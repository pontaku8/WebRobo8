var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
export class GenAi {
    constructor(init) {
        var _a;
        this.prompt = (_a = init.prompt) !== null && _a !== void 0 ? _a : '';
        this.genai = new ChatGoogleGenerativeAI({
            model: 'gemini-pro',
            maxOutputTokens: 2048,
        });
        this.generated = '';
    }
    invoke() {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.genai.invoke([
                [
                    'human',
                    `
          ${this.prompt}
          `,
                ],
            ]);
            this.generated = res.content;
        });
    }
    // todo 
    isValid() {
        return true;
    }
    generate() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isValid())
                return '';
            yield this.invoke();
            return this.generated;
        });
    }
}
