export class RoboError extends Error {
    constructor(init) {
        var _a;
        super();
        this.errors = (_a = init.errors) !== null && _a !== void 0 ? _a : {};
    }
}
