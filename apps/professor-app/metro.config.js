const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Fazer o Metro enxergar o workspace/monorepo
config.watchFolders = [workspaceRoot];

// Resolver módulos primeiro no app, depois na raiz do workspace
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Evitar resolução hierárquica inconsistente em monorepo/pnpm
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
