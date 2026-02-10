#!/usr/bin/env node
/**
 * Patches codegen to always emit a nil-safe RCTThirdPartyComponentsProvider.mm
 * (avoids dictionaryWithObjects:forKeys:count: crash when New Arch is OFF - RN #51077).
 * Uses an inline safe implementation so it works regardless of project path or safe.mm file.
 */
const fs = require('fs');
const path = require('path');

const executorPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native',
  'scripts',
  'codegen',
  'generate-artifacts-executor.js'
);

if (!fs.existsSync(executorPath)) {
  console.warn('[surfSUP] generate-artifacts-executor.js not found, skipping.');
  process.exit(0);
}

let content = fs.readFileSync(executorPath, 'utf8');

if (content.includes('Always emit nil-safe implementation') || content.includes('fs.writeFileSync(finalPathMM, safeMM)')) {
  process.exit(0);
}

// Inline nil-safe .mm content (no dict literal, no NSClassFromString in dict)
const inlineSafeBlock = `  const finalPathMM = path.join(
    outputDir,
    'RCTThirdPartyComponentsProvider.mm',
  );
  // Always emit nil-safe implementation (avoids dictionaryWithObjects:forKeys:count: crash when New Arch is OFF - RN #51077)
  const safeMM = \`/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <Foundation/Foundation.h>
#import "RCTThirdPartyComponentsProvider.h"
#import <React/RCTComponentViewProtocol.h>

@implementation RCTThirdPartyComponentsProvider

+ (NSDictionary<NSString *, Class<RCTComponentViewProtocol>> *)thirdPartyFabricComponents
{
  static NSDictionary<NSString *, Class<RCTComponentViewProtocol>> *thirdPartyComponents = nil;
  static dispatch_once_t nativeComponentsToken;

  dispatch_once(&nativeComponentsToken, ^{
    NSMutableDictionary<NSString *, Class<RCTComponentViewProtocol>> *dict = [NSMutableDictionary new];
    Class _c = nil;
    (void)_c;
    thirdPartyComponents = [dict copy];
  });

  return thirdPartyComponents;
}

@end
\`;
  fs.writeFileSync(finalPathMM, safeMM);`;

// Pattern 1: vanilla executor (finalPathMM then thirdPartyComponentsMapping then writeFileSync)
const vanillaBlock = /  const finalPathMM = path\.join\(\s*outputDir,\s*'RCTThirdPartyComponentsProvider\.mm',\s*\);\s*const appSafePath = projectRoot[^;]+;[^}]+}[^}]+}[^}]*\s*fs\.writeFileSync\(finalPathMM, templateMM\);/;
// Pattern 2: already patched with appSafePath (use app safe .mm when present)
const appSafePathBlock = /  const finalPathMM = path\.join\(\s*outputDir,\s*'RCTThirdPartyComponentsProvider\.mm',\s*\);\s*\/\/ surfSUP:[^\n]+\s*const appSafePath[^;]+;[^}]+}[^}]+}[^}]*\s*fs\.writeFileSync\(finalPathMM, templateMM\);/;

// Replace either the appSafePath block or the block that ends with fs.writeFileSync(finalPathMM, templateMM)
const blockToReplace = /  const finalPathMM = path\.join\(\s*outputDir,\s*'RCTThirdPartyComponentsProvider\.mm',\s*\);\s*(?:\/\/[^\n]*\s*)?(?:const appSafePath[^;]+;[^}]+} else \{[^}]*const thirdPartyComponentsMapping[^}]+}[^}]+}[^}]*templateMM = fs[^;]+;[^}]*}\s*)?fs\.writeFileSync\(finalPathMM, templateMM\);/;

if (!blockToReplace.test(content)) {
  // Try simpler: find the line that starts the block and replace until fs.writeFileSync(finalPathMM, templateMM);
  const start = content.indexOf("  const finalPathMM = path.join(\n    outputDir,\n    'RCTThirdPartyComponentsProvider.mm',");
  if (start === -1) {
    console.warn('[surfSUP] Could not find RCTThirdPartyComponentsProvider.mm block in executor.');
    process.exit(0);
  }
  const end = content.indexOf('fs.writeFileSync(finalPathMM, templateMM);', start);
  if (end === -1) {
    console.warn('[surfSUP] Could not find writeFileSync in executor block.');
    process.exit(0);
  }
  const endLine = content.indexOf('\n', end) + 1;
  content = content.slice(0, start) + inlineSafeBlock + content.slice(endLine);
} else {
  content = content.replace(blockToReplace, inlineSafeBlock);
}

fs.writeFileSync(executorPath, content);
console.log('[surfSUP] Patched generate-artifacts-executor.js (nil-safe RCTThirdPartyComponentsProvider).');
