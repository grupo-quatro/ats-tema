"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCandidate = exports.healthCheck = void 0;
var health_check_1 = require("./callables/health-check");
Object.defineProperty(exports, "healthCheck", { enumerable: true, get: function () { return health_check_1.healthCheck; } });
var register_candidate_1 = require("./triggers/register-candidate");
Object.defineProperty(exports, "registerCandidate", { enumerable: true, get: function () { return register_candidate_1.registerCandidate; } });
