// The original YodleeController has been split into three focused controllers.
// See the controllers/ subdirectory:
//   controllers/yodlee-me.controller.ts      — /yodlee/me/* (authenticated user)
//   controllers/yodlee-sandbox.controller.ts — /yodlee/sandbox/* (demo data)
//   controllers/yodlee-admin.controller.ts   — /yodlee/* admin-only endpoints

export { YodleeMeController } from './controllers/yodlee-me.controller.js';
export { YodleeSandboxController } from './controllers/yodlee-sandbox.controller.js';
export { YodleeAdminController } from './controllers/yodlee-admin.controller.js';
