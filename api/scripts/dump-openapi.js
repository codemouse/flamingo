"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const core_1 = require("@nestjs/core");
const platform_fastify_1 = require("@nestjs/platform-fastify");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("../src/app.module");
async function main() {
    const outArg = process.argv[2];
    if (!outArg) {
        console.error('Usage: dump-openapi <output-path>');
        process.exit(1);
    }
    const outPath = (0, node_path_1.resolve)(outArg);
    const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_fastify_1.FastifyAdapter({ trustProxy: true, bodyLimit: 1_048_576 }), { logger: false });
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Flamingo API')
        .setDescription('Flamingo REST API')
        .setVersion('1.0')
        .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearer')
        .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'admin-jwt')
        .build();
    await app.init();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    (0, node_fs_1.mkdirSync)((0, node_path_1.dirname)(outPath), { recursive: true });
    (0, node_fs_1.writeFileSync)(outPath, JSON.stringify(document, null, 2));
    console.log(`OpenAPI written → ${outPath}`);
    await app.close();
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=dump-openapi.js.map