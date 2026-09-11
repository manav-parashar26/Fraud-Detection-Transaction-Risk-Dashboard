const path = require('path');
const fs = require('fs');

/**
 * Resolves the path to the compiled C++ Fraud Detection Engine binary.
 * Supports configurable override via CPP_ENGINE_PATH, followed by search across
 * standard Windows and Linux/POSIX binary locations.
 */
function getEngineExecutablePath() {
  if (process.env.CPP_ENGINE_PATH) {
    const customPath = path.resolve(process.env.CPP_ENGINE_PATH);
    if (fs.existsSync(customPath)) {
      return customPath;
    }
    console.warn(`[Engine] Configured CPP_ENGINE_PATH not found: ${customPath}`);
  }

  const candidates = [
    // Standard relative locations from backend/src/config
    path.resolve(__dirname, '../../../fraud-engine/fraud_engine.exe'),
    path.resolve(__dirname, '../../../fraud-engine/fraud_engine'),
    path.resolve(__dirname, '../../../fraud-engine/fraud_detector.exe'),
    path.resolve(__dirname, '../../fraud-engine/fraud_engine.exe'),
    path.resolve(__dirname, '../../fraud-engine/fraud_engine'),
    path.resolve(__dirname, '../fraud-engine/fraud_engine'),
    // Container and system-wide locations
    '/app/fraud-engine/fraud_engine',
    '/usr/local/bin/fraud_engine',
    '/bin/fraud_engine',
    // Working-directory relative locations
    path.join(process.cwd(), 'fraud-engine', 'fraud_engine.exe'),
    path.join(process.cwd(), 'fraud-engine', 'fraud_engine'),
    path.join(process.cwd(), '..', 'fraud-engine', 'fraud_engine.exe'),
    path.join(process.cwd(), '..', 'fraud-engine', 'fraud_engine')
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch (err) {
      // Ignore file access permission errors for non-existent candidate paths
    }
  }

  throw new Error(
    'C++ Fraud Engine binary not found. Please compile the C++ engine (fraud-engine/fraud_engine) or configure CPP_ENGINE_PATH.'
  );
}

/**
 * Checks whether the C++ Fraud Detection Engine binary is available.
 */
function isEngineAvailable() {
  try {
    getEngineExecutablePath();
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Resolves the directory housing the C++ binary or source code.
 */
function getEngineDirectory() {
  try {
    const exe = getEngineExecutablePath();
    return path.dirname(exe);
  } catch (err) {
    return path.resolve(__dirname, '../../../fraud-engine');
  }
}

module.exports = {
  getEngineExecutablePath,
  isEngineAvailable,
  getEngineDirectory
};
