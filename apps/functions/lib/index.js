"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onCVUploaded = exports.registerCandidate = exports.healthCheck = void 0;
var health_check_1 = require("./callables/health-check");
Object.defineProperty(exports, "healthCheck", { enumerable: true, get: function () { return health_check_1.healthCheck; } });
var register_candidate_1 = require("./triggers/register-candidate");
Object.defineProperty(exports, "registerCandidate", { enumerable: true, get: function () { return register_candidate_1.registerCandidate; } });
var on_cv_uploaded_1 = require("./triggers/on-cv-uploaded");
Object.defineProperty(exports, "onCVUploaded", { enumerable: true, get: function () { return on_cv_uploaded_1.onCVUploaded; } });
