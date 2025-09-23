"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.child = child;
const pino_1 = __importDefault(require("pino"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const LOG_DIR = process.env.LOG_DIR || node_path_1.default.join(process.cwd(), 'logs');
if (!node_fs_1.default.existsSync(LOG_DIR))
    node_fs_1.default.mkdirSync(LOG_DIR, { recursive: true });
const transport = pino_1.default.transport({
    targets: [
        { target: 'pino-pretty', level: process.env.LOG_LEVEL || 'debug', options: { colorize: true } },
        { target: 'pino/file', level: process.env.LOG_LEVEL || 'debug', options: { destination: node_path_1.default.join(LOG_DIR, 'app.log') } }
    ]
});
exports.logger = (0, pino_1.default)({ name: process.env.SERVICE_NAME || 'ivylevel', level: process.env.LOG_LEVEL || 'debug' }, transport);
function child(meta) { return exports.logger.child(meta); }
