"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
var sse_js_1 = require("@modelcontextprotocol/sdk/server/sse.js");
var types_js_1 = require("@modelcontextprotocol/sdk/types.js");
var promises_1 = __importDefault(require("fs/promises"));
var path_1 = __importDefault(require("path"));
var os_1 = __importDefault(require("os"));
var crypto_1 = require("crypto");
var child_process_1 = require("child_process");
var app = (0, express_1.default)();
app.use(express_1.default.json());
// ─── CORS: Essential for browser-based UI clients ───────────────────────────
app.use(function (req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS")
        return res.sendStatus(200);
    next();
});
// ─── In-process key-value memory store ───────────────────────────────────────
var memoryStore = {};
// ─── Helpers ─────────────────────────────────────────────────────────────────
var NWS_API_BASE = "https://api.weather.gov";
var UA = "Mozilla/5.0 (WormGPT-MCP/2.0)";
function nwsRequest(url) {
    return __awaiter(this, void 0, void 0, function () {
        var r;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetch(url, { headers: { "User-Agent": UA, "Accept": "application/geo+json" } })];
                case 1:
                    r = _a.sent();
                    if (!r.ok)
                        return [2 /*return*/, null];
                    return [2 /*return*/, r.json()];
            }
        });
    });
}
function isWindows() { return process.platform === "win32"; }
function runCmd(cmd, limit) {
    var _a;
    if (limit === void 0) { limit = 0; }
    try {
        var out = (0, child_process_1.execSync)(cmd, { timeout: 10000 }).toString().trim();
        return limit > 0 ? out.substring(0, limit) : out;
    }
    catch (e) {
        return "Error: ".concat(((_a = e.message) === null || _a === void 0 ? void 0 : _a.split('\n')[0]) || 'Command failed');
    }
}
// ─── Tool Manifest ────────────────────────────────────────────────────────────
var listToolsHandler = function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, ({
                tools: [
                    // ── Memory ──
                    {
                        name: "store_memory",
                        description: "Store key-value data persistently in the MCP server's process memory across conversations.",
                        inputSchema: { type: "object", properties: { id: { type: "string" }, content: { type: "string" } }, required: ["id", "content"] }
                    },
                    {
                        name: "read_memory",
                        description: "Retrieve previously stored data from MCP memory by key ID.",
                        inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] }
                    },
                    {
                        name: "list_memories",
                        description: "List all stored memory keys in the MCP server.",
                        inputSchema: { type: "object", properties: {} }
                    },
                    {
                        name: "delete_memory",
                        description: "Delete a stored memory entry by key ID.",
                        inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] }
                    },
                    // ── Weather (US only via NWS) ──
                    {
                        name: "get_alerts",
                        description: "Get NOAA weather alerts for a US state (2-letter code, e.g. CA, TX, NY).",
                        inputSchema: { type: "object", properties: { state: { type: "string", minLength: 2, maxLength: 2 } }, required: ["state"] }
                    },
                    {
                        name: "get_forecast",
                        description: "Get 5-period weather forecast for any US location by latitude/longitude.",
                        inputSchema: { type: "object", properties: { latitude: { type: "number" }, longitude: { type: "number" } }, required: ["latitude", "longitude"] }
                    },
                    // ── Filesystem ──
                    {
                        name: "list_directory",
                        description: "List the contents of a local directory with file sizes and types.",
                        inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] }
                    },
                    {
                        name: "read_file",
                        description: "Read the content of a local file (text files, max 100KB returned).",
                        inputSchema: { type: "object", properties: { path: { type: "string" }, start_line: { type: "number" }, end_line: { type: "number" } }, required: ["path"] }
                    },
                    {
                        name: "write_file",
                        description: "Write or overwrite content to a local file.",
                        inputSchema: { type: "object", properties: { path: { type: "string" }, content: { type: "string" }, append: { type: "boolean" } }, required: ["path", "content"] }
                    },
                    {
                        name: "delete_file",
                        description: "Delete a local file. Use with caution.",
                        inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] }
                    },
                    {
                        name: "search_files",
                        description: "Search for files matching a pattern within a directory (fast recursive grep).",
                        inputSchema: {
                            type: "object",
                            properties: {
                                directory: { type: "string" },
                                pattern: { type: "string", description: "Filename pattern or text to search for inside files" },
                                search_content: { type: "boolean", description: "If true, search file contents; otherwise search filenames" }
                            },
                            required: ["directory", "pattern"]
                        }
                    },
                    // ── System Info ──
                    {
                        name: "get_system_stats",
                        description: "Get comprehensive CPU, RAM, OS, architecture, and uptime information.",
                        inputSchema: { type: "object", properties: {} }
                    },
                    {
                        name: "get_network_info",
                        description: "Get all local network interfaces, IP addresses, and MAC addresses.",
                        inputSchema: { type: "object", properties: {} }
                    },
                    {
                        name: "get_process_list",
                        description: "Get a list of currently running processes with PID and memory usage.",
                        inputSchema: { type: "object", properties: { limit: { type: "number", default: 25 } } }
                    },
                    {
                        name: "get_disk_usage",
                        description: "Get disk capacity, used space, and free space for all local drives.",
                        inputSchema: { type: "object", properties: {} }
                    },
                    {
                        name: "get_system_uptime",
                        description: "Get system uptime in days, hours, and minutes with load averages.",
                        inputSchema: { type: "object", properties: {} }
                    },
                    {
                        name: "get_env_vars",
                        description: "Get environment variables. Optionally filter by a key prefix (e.g. 'PATH', 'NODE').",
                        inputSchema: { type: "object", properties: { prefix: { type: "string", description: "Optional prefix filter" } } }
                    },
                    // ── File Operations ──
                    {
                        name: "get_file_hashes",
                        description: "Compute SHA256 and MD5 hashes for a local file. Useful for integrity checks.",
                        inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] }
                    },
                    // ── Network & Security ──
                    {
                        name: "ping_host",
                        description: "Check TCP reachability of a host via an HTTP HEAD request. Returns latency.",
                        inputSchema: { type: "object", properties: { host: { type: "string" }, protocol: { type: "string", enum: ["http", "https"], default: "https" } }, required: ["host"] }
                    },
                    {
                        name: "get_dns_records",
                        description: "Perform a full DNS lookup for A, MX, TXT, AAAA, NS records on a domain.",
                        inputSchema: { type: "object", properties: { domain: { type: "string" }, type: { type: "string", default: "A" } }, required: ["domain"] }
                    },
                    // ── GitHub ──
                    {
                        name: "get_github_repo",
                        description: "Fetch metadata, stars, forks, and description for any public GitHub repository.",
                        inputSchema: { type: "object", properties: { owner: { type: "string" }, repo: { type: "string" } }, required: ["owner", "repo"] }
                    },
                    {
                        name: "get_github_issues",
                        description: "List open issues for a GitHub repository with labels and comments.",
                        inputSchema: { type: "object", properties: { owner: { type: "string" }, repo: { type: "string" }, state: { type: "string", enum: ["open", "closed", "all"], default: "open" }, limit: { type: "number", default: 10 } }, required: ["owner", "repo"] }
                    },
                    {
                        name: "get_github_commits",
                        description: "Get recent commit history for a GitHub repository.",
                        inputSchema: { type: "object", properties: { owner: { type: "string" }, repo: { type: "string" }, limit: { type: "number", default: 10 } }, required: ["owner", "repo"] }
                    },
                    // ── Shell Execution ──
                    {
                        name: "run_shell_command",
                        description: "Execute a shell command on the local system and return stdout/stderr. USE WITH CAUTION.",
                        inputSchema: { type: "object", properties: { command: { type: "string", description: "Shell command to run (bash/cmd)" }, timeout_ms: { type: "number", default: 10000 } }, required: ["command"] }
                    },
                    // ── HTTP Proxy (server-side, no CORS for external APIs) ──
                    {
                        name: "http_request",
                        description: "Make an HTTP/HTTPS request from the server side (bypasses browser CORS). Supports GET, POST, PUT, DELETE.",
                        inputSchema: {
                            type: "object",
                            properties: {
                                url: { type: "string" },
                                method: { type: "string", enum: ["GET", "POST", "PUT", "DELETE", "PATCH"], default: "GET" },
                                headers: { type: "object", additionalProperties: { type: "string" } },
                                body: { type: "string" }
                            },
                            required: ["url"]
                        }
                    }
                ]
            })];
    });
}); };
// ─── Tool Execution ───────────────────────────────────────────────────────────
var callToolHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name, args, a, txt, _b, keys, data, res, pts, fc, res, resolved_1, entries, lines, e_1, resolved, raw, lines, start, end, content, e_2, resolved, e_3, resolved, e_4, dir, cmd, results_1, walk_1, e_5, cpus, stats, limit, cmd, cmd, up, days, hrs, mins, load, env, prefix_1, filtered, buf, sha256, md5, sha1, e_6, proto, url, start, r, ms, e_7, types, results_2, e_8, r, d, e_9, limit, state, r, issues, e_10, limit, r, commits, e_11, cmd, timeout, output, out, method, opts, r, text, e_12;
    var _c, _d, _e, _f, _g, _h, _j;
    return __generator(this, function (_k) {
        switch (_k.label) {
            case 0:
                _a = request.params, name = _a.name, args = _a.arguments;
                a = (args || {});
                txt = function (t) { return ({ content: [{ type: "text", text: t }] }); };
                _b = name;
                switch (_b) {
                    case "store_memory": return [3 /*break*/, 1];
                    case "read_memory": return [3 /*break*/, 2];
                    case "list_memories": return [3 /*break*/, 3];
                    case "delete_memory": return [3 /*break*/, 4];
                    case "get_alerts": return [3 /*break*/, 5];
                    case "get_forecast": return [3 /*break*/, 7];
                    case "list_directory": return [3 /*break*/, 10];
                    case "read_file": return [3 /*break*/, 14];
                    case "write_file": return [3 /*break*/, 17];
                    case "delete_file": return [3 /*break*/, 22];
                    case "search_files": return [3 /*break*/, 25];
                    case "get_system_stats": return [3 /*break*/, 30];
                    case "get_network_info": return [3 /*break*/, 31];
                    case "get_process_list": return [3 /*break*/, 32];
                    case "get_disk_usage": return [3 /*break*/, 33];
                    case "get_system_uptime": return [3 /*break*/, 34];
                    case "get_env_vars": return [3 /*break*/, 35];
                    case "get_file_hashes": return [3 /*break*/, 36];
                    case "ping_host": return [3 /*break*/, 39];
                    case "get_dns_records": return [3 /*break*/, 43];
                    case "get_github_repo": return [3 /*break*/, 46];
                    case "get_github_issues": return [3 /*break*/, 50];
                    case "get_github_commits": return [3 /*break*/, 54];
                    case "run_shell_command": return [3 /*break*/, 58];
                    case "http_request": return [3 /*break*/, 59];
                }
                return [3 /*break*/, 63];
            case 1:
                memoryStore[a.id] = a.content;
                return [2 /*return*/, txt("\u2705 Stored under key: '".concat(a.id, "' (").concat(a.content.length, " chars)"))];
            case 2: return [2 /*return*/, txt((_c = memoryStore[a.id]) !== null && _c !== void 0 ? _c : "\u274C No memory found for key: '".concat(a.id, "'"))];
            case 3:
                {
                    keys = Object.keys(memoryStore);
                    if (keys.length === 0)
                        return [2 /*return*/, txt("Memory is empty.")];
                    return [2 /*return*/, txt(keys.map(function (k) { return "\u2022 ".concat(k, " (").concat(memoryStore[k].length, " chars)"); }).join('\n'))];
                }
                _k.label = 4;
            case 4:
                if (a.id in memoryStore) {
                    delete memoryStore[a.id];
                    return [2 /*return*/, txt("\u2705 Deleted key: '".concat(a.id, "'"))];
                }
                return [2 /*return*/, txt("\u274C Key '".concat(a.id, "' not found."))];
            case 5: return [4 /*yield*/, nwsRequest("".concat(NWS_API_BASE, "/alerts/active/area/").concat(a.state.toUpperCase()))];
            case 6:
                data = _k.sent();
                if (!(data === null || data === void 0 ? void 0 : data.features))
                    return [2 /*return*/, txt("No alerts or NWS API error.")];
                res = data.features.map(function (f) {
                    return "\uD83D\uDEA8 ".concat(f.properties.event, "\nArea: ").concat(f.properties.areaDesc, "\nSeverity: ").concat(f.properties.severity, "\nDesc: ").concat((f.properties.description || '').substring(0, 200));
                }).join("\n\n---\n\n");
                return [2 /*return*/, txt(res || "✅ No active weather alerts.")];
            case 7: return [4 /*yield*/, nwsRequest("".concat(NWS_API_BASE, "/points/").concat(a.latitude, ",").concat(a.longitude))];
            case 8:
                pts = _k.sent();
                if (!((_d = pts === null || pts === void 0 ? void 0 : pts.properties) === null || _d === void 0 ? void 0 : _d.forecast))
                    return [2 /*return*/, txt("Unable to resolve forecast. Check coordinates.")];
                return [4 /*yield*/, nwsRequest(pts.properties.forecast)];
            case 9:
                fc = _k.sent();
                res = (((_e = fc === null || fc === void 0 ? void 0 : fc.properties) === null || _e === void 0 ? void 0 : _e.periods) || []).slice(0, 7).map(function (p) {
                    return "\uD83D\uDCC5 ".concat(p.name, ": ").concat(p.temperature).concat(p.temperatureUnit, " \u2014 ").concat(p.shortForecast, " (Wind: ").concat(p.windSpeed, " ").concat(p.windDirection, ")");
                }).join("\n");
                return [2 /*return*/, txt(res || "No forecast data.")];
            case 10:
                _k.trys.push([10, 13, , 14]);
                resolved_1 = path_1.default.resolve(a.path);
                return [4 /*yield*/, promises_1.default.readdir(resolved_1, { withFileTypes: true })];
            case 11:
                entries = _k.sent();
                return [4 /*yield*/, Promise.all(entries.map(function (e) { return __awaiter(void 0, void 0, void 0, function () {
                        var stat, size, _a;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _b.trys.push([0, 2, , 3]);
                                    return [4 /*yield*/, promises_1.default.stat(path_1.default.join(resolved_1, e.name))];
                                case 1:
                                    stat = _b.sent();
                                    size = e.isDirectory() ? '<DIR>' : "".concat((stat.size / 1024).toFixed(1), "KB");
                                    return [2 /*return*/, "".concat(e.isDirectory() ? '📁' : '📄', " ").concat(e.name, " (").concat(size, ")")];
                                case 2:
                                    _a = _b.sent();
                                    return [2 /*return*/, "  ".concat(e.name)];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); }))];
            case 12:
                lines = _k.sent();
                return [2 /*return*/, txt("Directory: ".concat(resolved_1, "\n\n").concat(lines.join('\n')))];
            case 13:
                e_1 = _k.sent();
                return [2 /*return*/, txt("Error: ".concat(e_1.message))];
            case 14:
                _k.trys.push([14, 16, , 17]);
                resolved = path_1.default.resolve(a.path);
                return [4 /*yield*/, promises_1.default.readFile(resolved, "utf-8")];
            case 15:
                raw = _k.sent();
                lines = raw.split('\n');
                if (a.start_line || a.end_line) {
                    start = (a.start_line || 1) - 1;
                    end = a.end_line || lines.length;
                    lines = lines.slice(start, end);
                }
                content = lines.join('\n').substring(0, 100000);
                return [2 /*return*/, txt(content)];
            case 16:
                e_2 = _k.sent();
                return [2 /*return*/, txt("Error: ".concat(e_2.message))];
            case 17:
                _k.trys.push([17, 21, , 22]);
                resolved = path_1.default.resolve(a.path);
                if (!a.append) return [3 /*break*/, 19];
                return [4 /*yield*/, promises_1.default.appendFile(resolved, a.content)];
            case 18:
                _k.sent();
                return [2 /*return*/, txt("\u2705 Appended ".concat(a.content.length, " chars to ").concat(resolved))];
            case 19: return [4 /*yield*/, promises_1.default.writeFile(resolved, a.content, "utf-8")];
            case 20:
                _k.sent();
                return [2 /*return*/, txt("\u2705 Written ".concat(a.content.length, " chars to ").concat(resolved))];
            case 21:
                e_3 = _k.sent();
                return [2 /*return*/, txt("Error: ".concat(e_3.message))];
            case 22:
                _k.trys.push([22, 24, , 25]);
                resolved = path_1.default.resolve(a.path);
                return [4 /*yield*/, promises_1.default.unlink(resolved)];
            case 23:
                _k.sent();
                return [2 /*return*/, txt("\u2705 Deleted: ".concat(resolved))];
            case 24:
                e_4 = _k.sent();
                return [2 /*return*/, txt("Error: ".concat(e_4.message))];
            case 25:
                _k.trys.push([25, 29, , 30]);
                dir = path_1.default.resolve(a.directory);
                if (!a.search_content) return [3 /*break*/, 26];
                cmd = isWindows()
                    ? "findstr /S /I /M \"".concat(a.pattern.replace(/"/g, ''), "\" \"").concat(dir, "\\*\"")
                    : "grep -rl \"".concat(a.pattern.replace(/"/g, ''), "\" \"").concat(dir, "\" 2>/dev/null | head -50");
                return [2 /*return*/, txt(runCmd(cmd, 10000) || "No matches found.")];
            case 26:
                results_1 = [];
                walk_1 = function (d_1) {
                    var args_1 = [];
                    for (var _i = 1; _i < arguments.length; _i++) {
                        args_1[_i - 1] = arguments[_i];
                    }
                    return __awaiter(void 0, __spreadArray([d_1], args_1, true), void 0, function (d, depth) {
                        var entries, _a, entries_1, e;
                        if (depth === void 0) { depth = 0; }
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    if (depth > 8 || results_1.length >= 100)
                                        return [2 /*return*/];
                                    return [4 /*yield*/, promises_1.default.readdir(d, { withFileTypes: true }).catch(function () { return []; })];
                                case 1:
                                    entries = _b.sent();
                                    _a = 0, entries_1 = entries;
                                    _b.label = 2;
                                case 2:
                                    if (!(_a < entries_1.length)) return [3 /*break*/, 5];
                                    e = entries_1[_a];
                                    if (e.name.toLowerCase().includes(a.pattern.toLowerCase()))
                                        results_1.push(path_1.default.join(d, e.name));
                                    if (!e.isDirectory()) return [3 /*break*/, 4];
                                    return [4 /*yield*/, walk_1(path_1.default.join(d, e.name), depth + 1)];
                                case 3:
                                    _b.sent();
                                    _b.label = 4;
                                case 4:
                                    _a++;
                                    return [3 /*break*/, 2];
                                case 5: return [2 /*return*/];
                            }
                        });
                    });
                };
                return [4 /*yield*/, walk_1(dir)];
            case 27:
                _k.sent();
                return [2 /*return*/, txt(results_1.length > 0 ? results_1.join('\n') : "No files matching pattern found.")];
            case 28: return [3 /*break*/, 30];
            case 29:
                e_5 = _k.sent();
                return [2 /*return*/, txt("Error: ".concat(e_5.message))];
            case 30:
                {
                    cpus = os_1.default.cpus();
                    stats = {
                        os: "".concat(os_1.default.type(), " ").concat(os_1.default.release(), " (").concat(os_1.default.version(), ")"),
                        arch: os_1.default.arch(),
                        hostname: os_1.default.hostname(),
                        cpu_model: ((_f = cpus[0]) === null || _f === void 0 ? void 0 : _f.model) || 'Unknown',
                        cpu_cores: cpus.length,
                        cpu_speed_mhz: ((_g = cpus[0]) === null || _g === void 0 ? void 0 : _g.speed) || 0,
                        free_mem_gb: (os_1.default.freemem() / Math.pow(1024, 3)).toFixed(2),
                        total_mem_gb: (os_1.default.totalmem() / Math.pow(1024, 3)).toFixed(2),
                        used_mem_pct: (((os_1.default.totalmem() - os_1.default.freemem()) / os_1.default.totalmem()) * 100).toFixed(1) + '%',
                        uptime_hours: (os_1.default.uptime() / 3600).toFixed(2),
                        load_avg: os_1.default.loadavg().map(function (x) { return x.toFixed(2); }).join(', '),
                        node_version: process.version,
                        platform: process.platform
                    };
                    return [2 /*return*/, txt(JSON.stringify(stats, null, 2))];
                }
                _k.label = 31;
            case 31: return [2 /*return*/, txt(JSON.stringify(os_1.default.networkInterfaces(), null, 2))];
            case 32:
                {
                    limit = a.limit || 25;
                    cmd = isWindows()
                        ? "tasklist /FO CSV /NH"
                        : "ps -eo comm,pid,%mem,%cpu --sort=-%mem | head -n ".concat(limit + 1);
                    return [2 /*return*/, txt(runCmd(cmd, 8000))];
                }
                _k.label = 33;
            case 33:
                {
                    cmd = isWindows()
                        ? 'wmic logicaldisk get caption,size,freespace,filesystem /FORMAT:LIST'
                        : 'df -h --output=source,size,used,avail,pcent,target';
                    return [2 /*return*/, txt(runCmd(cmd, 5000))];
                }
                _k.label = 34;
            case 34:
                {
                    up = os_1.default.uptime();
                    days = Math.floor(up / 86400);
                    hrs = Math.floor((up % 86400) / 3600);
                    mins = Math.floor((up % 3600) / 60);
                    load = os_1.default.loadavg().map(function (x) { return x.toFixed(2); }).join(', ');
                    return [2 /*return*/, txt("Uptime: ".concat(days, "d ").concat(hrs, "h ").concat(mins, "m\nLoad Averages (1m/5m/15m): ").concat(load, "\nNode.js: ").concat(process.version, "\nPID: ").concat(process.pid))];
                }
                _k.label = 35;
            case 35:
                {
                    env = process.env;
                    prefix_1 = ((_h = a.prefix) === null || _h === void 0 ? void 0 : _h.toUpperCase()) || '';
                    filtered = Object.entries(env)
                        .filter(function (_a) {
                        var k = _a[0];
                        return !prefix_1 || k.toUpperCase().startsWith(prefix_1);
                    })
                        .map(function (_a) {
                        var k = _a[0], v = _a[1];
                        return "".concat(k, "=").concat(v);
                    })
                        .slice(0, 100);
                    return [2 /*return*/, txt(filtered.join('\n') || 'No matching environment variables.')];
                }
                _k.label = 36;
            case 36:
                _k.trys.push([36, 38, , 39]);
                return [4 /*yield*/, promises_1.default.readFile(path_1.default.resolve(a.path))];
            case 37:
                buf = _k.sent();
                sha256 = (0, crypto_1.createHash)("sha256").update(buf).digest("hex");
                md5 = (0, crypto_1.createHash)("md5").update(buf).digest("hex");
                sha1 = (0, crypto_1.createHash)("sha1").update(buf).digest("hex");
                return [2 /*return*/, txt("File: ".concat(a.path, "\nSize: ").concat((buf.length / 1024).toFixed(2), " KB\nSHA256: ").concat(sha256, "\nSHA1:   ").concat(sha1, "\nMD5:    ").concat(md5))];
            case 38:
                e_6 = _k.sent();
                return [2 /*return*/, txt("Error: ".concat(e_6.message))];
            case 39:
                proto = a.protocol || 'https';
                url = "".concat(proto, "://").concat(a.host);
                start = Date.now();
                _k.label = 40;
            case 40:
                _k.trys.push([40, 42, , 43]);
                return [4 /*yield*/, fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) })];
            case 41:
                r = _k.sent();
                ms = Date.now() - start;
                return [2 /*return*/, txt("\u2705 ".concat(a.host, " is REACHABLE\nStatus: ").concat(r.status, " ").concat(r.statusText, "\nLatency: ").concat(ms, "ms\nServer: ").concat(r.headers.get('server') || 'N/A', "\nContent-Type: ").concat(r.headers.get('content-type') || 'N/A'))];
            case 42:
                e_7 = _k.sent();
                return [2 /*return*/, txt("\u274C ".concat(a.host, " is UNREACHABLE\nError: ").concat(e_7.message, "\nLatency: ").concat(Date.now() - start, "ms"))];
            case 43:
                _k.trys.push([43, 45, , 46]);
                types = a.type ? [a.type] : ['A', 'MX', 'TXT', 'AAAA', 'NS'];
                results_2 = {};
                return [4 /*yield*/, Promise.all(types.map(function (t) { return __awaiter(void 0, void 0, void 0, function () {
                        var r, d;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, fetch("https://dns.google/resolve?name=".concat(encodeURIComponent(a.domain), "&type=").concat(t))];
                                case 1:
                                    r = _a.sent();
                                    return [4 /*yield*/, r.json()];
                                case 2:
                                    d = _a.sent();
                                    if (d.Answer)
                                        results_2[t] = d.Answer.map(function (rec) { return ({ ttl: rec.TTL, data: rec.data }); });
                                    return [2 /*return*/];
                            }
                        });
                    }); }))];
            case 44:
                _k.sent();
                return [2 /*return*/, txt(JSON.stringify(results_2, null, 2))];
            case 45:
                e_8 = _k.sent();
                return [2 /*return*/, txt("Error: ".concat(e_8.message))];
            case 46:
                _k.trys.push([46, 49, , 50]);
                return [4 /*yield*/, fetch("https://api.github.com/repos/".concat(a.owner, "/").concat(a.repo), {
                        headers: { 'User-Agent': UA, 'Accept': 'application/vnd.github.v3+json' }
                    })];
            case 47:
                r = _k.sent();
                if (!r.ok)
                    return [2 /*return*/, txt("GitHub API error: ".concat(r.status))];
                return [4 /*yield*/, r.json()];
            case 48:
                d = _k.sent();
                return [2 /*return*/, txt(JSON.stringify({
                        name: d.full_name, description: d.description, stars: d.stargazers_count,
                        forks: d.forks_count, watchers: d.watchers_count, open_issues: d.open_issues_count,
                        language: d.language, default_branch: d.default_branch, created_at: d.created_at,
                        pushed_at: d.pushed_at, license: (_j = d.license) === null || _j === void 0 ? void 0 : _j.name, topics: d.topics, url: d.html_url
                    }, null, 2))];
            case 49:
                e_9 = _k.sent();
                return [2 /*return*/, txt("Error: ".concat(e_9.message))];
            case 50:
                _k.trys.push([50, 53, , 54]);
                limit = a.limit || 10;
                state = a.state || 'open';
                return [4 /*yield*/, fetch("https://api.github.com/repos/".concat(a.owner, "/").concat(a.repo, "/issues?state=").concat(state, "&per_page=").concat(limit), {
                        headers: { 'User-Agent': UA, 'Accept': 'application/vnd.github.v3+json' }
                    })];
            case 51:
                r = _k.sent();
                if (!r.ok)
                    return [2 /*return*/, txt("GitHub API error: ".concat(r.status))];
                return [4 /*yield*/, r.json()];
            case 52:
                issues = _k.sent();
                return [2 /*return*/, txt(issues.map(function (i) {
                        return "#".concat(i.number, " [").concat(i.state, "] ").concat(i.title, "\nLabels: ").concat(i.labels.map(function (l) { return l.name; }).join(', ') || 'none', "\nComments: ").concat(i.comments, " | ").concat(i.html_url);
                    }).join('\n\n'))];
            case 53:
                e_10 = _k.sent();
                return [2 /*return*/, txt("Error: ".concat(e_10.message))];
            case 54:
                _k.trys.push([54, 57, , 58]);
                limit = a.limit || 10;
                return [4 /*yield*/, fetch("https://api.github.com/repos/".concat(a.owner, "/").concat(a.repo, "/commits?per_page=").concat(limit), {
                        headers: { 'User-Agent': UA, 'Accept': 'application/vnd.github.v3+json' }
                    })];
            case 55:
                r = _k.sent();
                if (!r.ok)
                    return [2 /*return*/, txt("GitHub API error: ".concat(r.status))];
                return [4 /*yield*/, r.json()];
            case 56:
                commits = _k.sent();
                return [2 /*return*/, txt(commits.map(function (c) {
                        return "".concat(c.sha.slice(0, 8), " | ").concat(c.commit.author.date.slice(0, 10), " | ").concat(c.commit.author.name, "\n  ").concat(c.commit.message.split('\n')[0]);
                    }).join('\n'))];
            case 57:
                e_11 = _k.sent();
                return [2 /*return*/, txt("Error: ".concat(e_11.message))];
            case 58:
                {
                    try {
                        cmd = a.command;
                        timeout = a.timeout_ms || 10000;
                        output = (0, child_process_1.execSync)(cmd, { timeout: timeout, encoding: 'utf-8', stdio: 'pipe' });
                        return [2 /*return*/, txt(output.substring(0, 20000) || '(no output)')];
                    }
                    catch (e) {
                        out = (e.stdout || '') + (e.stderr || '') || e.message;
                        return [2 /*return*/, txt("Command failed (exit ".concat(e.status || 1, "):\n").concat(out.substring(0, 5000)))];
                    }
                }
                _k.label = 59;
            case 59:
                _k.trys.push([59, 62, , 63]);
                method = a.method || 'GET';
                opts = {
                    method: method,
                    headers: __assign({ 'User-Agent': UA }, (a.headers || {})),
                    signal: AbortSignal.timeout(15000)
                };
                if (a.body && method !== 'GET')
                    opts.body = a.body;
                return [4 /*yield*/, fetch(a.url, opts)];
            case 60:
                r = _k.sent();
                return [4 /*yield*/, r.text()];
            case 61:
                text = _k.sent();
                return [2 /*return*/, txt("Status: ".concat(r.status, " ").concat(r.statusText, "\nContent-Type: ").concat(r.headers.get('content-type'), "\n\n").concat(text.substring(0, 50000)))];
            case 62:
                e_12 = _k.sent();
                return [2 /*return*/, txt("HTTP request failed: ".concat(e_12.message))];
            case 63: throw new Error("Tool '".concat(name, "' not found in WormGPT Elite Bridge."));
        }
    });
}); };
// ─── SSE Multi-client: each connection gets its own transport and server ──────
var transports = new Map();
app.get("/sse", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, transport, server;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = crypto.randomUUID();
                transport = new sse_js_1.SSEServerTransport("/message", res);
                server = new index_js_1.Server({
                    name: "wormgpt-elite-bridge",
                    version: "2.0.0"
                }, {
                    capabilities: { tools: {} }
                });
                server.setRequestHandler(types_js_1.ListToolsRequestSchema, listToolsHandler);
                server.setRequestHandler(types_js_1.CallToolRequestSchema, callToolHandler);
                transports.set(id, transport);
                res.on("close", function () {
                    transports.delete(id);
                    server.close().catch(function () { });
                    console.log("[MCP] Client ".concat(id.slice(0, 8), " disconnected. Active: ").concat(transports.size));
                });
                return [4 /*yield*/, server.connect(transport)];
            case 1:
                _a.sent();
                console.log("[MCP] \u2705 Client ".concat(id.slice(0, 8), " connected. Active: ").concat(transports.size));
                return [2 /*return*/];
        }
    });
}); });
app.post("/message", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var sessionId, transport;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                sessionId = req.headers['x-session-id'];
                transport = sessionId ? transports.get(sessionId) : Array.from(transports.values()).at(-1);
                if (!transport) return [3 /*break*/, 2];
                return [4 /*yield*/, transport.handlePostMessage(req, res)];
            case 1:
                _a.sent();
                return [3 /*break*/, 3];
            case 2:
                res.status(503).json({ error: "No active SSE transport. Connect to /sse first." });
                _a.label = 3;
            case 3: return [2 /*return*/];
        }
    });
}); });
// ─── Health endpoint ──────────────────────────────────────────────────────────
app.get("/health", function (_req, res) {
    res.json({
        status: "ok",
        version: "2.0.0",
        active_clients: transports.size,
        memory_entries: Object.keys(memoryStore).length,
        uptime_s: Math.floor(process.uptime()),
        node: process.version
    });
});
var PORT = process.env.MCP_PORT ? parseInt(process.env.MCP_PORT) : 3002;
app.listen(PORT, function () {
    console.log("\n\uD83D\uDD25 WormGPT Elite MCP Bridge v2.0.0");
    console.log("\uD83D\uDCE1 SSE Endpoint:  http://localhost:".concat(PORT, "/sse"));
    console.log("\uD83E\uDE7A Health Check: http://localhost:".concat(PORT, "/health"));
    console.log("\uD83D\uDEE0\uFE0F  Tools:        26 server-side tools available\n");
});
