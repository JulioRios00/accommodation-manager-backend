"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
require("./instrument");
const node_crypto_1 = require("node:crypto");
if (!globalThis.crypto)
    globalThis.crypto = node_crypto_1.webcrypto;
const core_1 = require("@nestjs/core");
const nestjs_pino_1 = require("nestjs-pino");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { bufferLogs: true });
    app.useLogger(app.get(nestjs_pino_1.Logger));
    app.setGlobalPrefix('api');
    app.enableCors({
        origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    });
    const port = process.env.PORT ?? 3001;
    await app.listen(port);
}
bootstrap();
//# sourceMappingURL=main.js.map