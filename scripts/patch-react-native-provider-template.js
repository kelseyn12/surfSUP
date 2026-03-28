#!/usr/bin/env node
/**
 * Patches RN codegen template so generated RCTThirdPartyComponentsProvider is nil-safe
 * (avoids nil in NSDictionary literal — RN #51077).
 * RN versions differ: some use @{ } with {thirdPartyComponentsMapping}, some use NSMutableDictionary.
 */
const fs = require('fs');
const path = require('path');

const templatePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native',
  'scripts',
  'codegen',
  'templates',
  'RCTThirdPartyComponentsProviderMM.template'
);

if (!fs.existsSync(templatePath)) {
  console.warn('[surfSUP] RCTThirdPartyComponentsProviderMM.template not found, skipping patch.');
  process.exit(0);
}

let content = fs.readFileSync(templatePath, 'utf8');

// Already patched (nil-safe empty registry, no placeholder)
if (content.includes('(void)_c;') && !content.includes('{thirdPartyComponentsMapping}')) {
  process.exit(0);
}

const safeBlock = `  dispatch_once(&nativeComponentsToken, ^{
    /* surfSUP: nil-safe empty registry when New Arch is OFF; avoids nil-insert crash */
    NSMutableDictionary<NSString *, Class<RCTComponentViewProtocol> > *dict = [NSMutableDictionary new];
    Class _c = nil;
    (void)_c;
    thirdPartyComponents = [dict copy];
  });`;

// Current RN: dictionary literal + placeholder (crashes when NSClassFromString returns nil)
const dictLiteralBlock = `  dispatch_once(&nativeComponentsToken, ^{
    thirdPartyComponents = @{
{thirdPartyComponentsMapping}
    };
  });`;

// Older RN: NSMutableDictionary + mapping lines
const mutableDictBlock = `  dispatch_once(&nativeComponentsToken, ^{
    NSMutableDictionary<NSString *, Class<RCTComponentViewProtocol> > *dict = [NSMutableDictionary new];
    Class _c = nil;
{thirdPartyComponentsMapping}
    thirdPartyComponents = [dict copy];
  });`;

if (content.includes(dictLiteralBlock)) {
  content = content.replace(dictLiteralBlock, safeBlock);
  fs.writeFileSync(templatePath, content);
  console.log('[surfSUP] Patched RCTThirdPartyComponentsProviderMM.template (dict-literal → nil-safe)');
  process.exit(0);
}

if (content.includes(mutableDictBlock)) {
  content = content.replace(mutableDictBlock, safeBlock);
  fs.writeFileSync(templatePath, content);
  console.log('[surfSUP] Patched RCTThirdPartyComponentsProviderMM.template (mutable-dict → nil-safe)');
  process.exit(0);
}

console.warn('[surfSUP] Template format changed, cannot patch RCTThirdPartyComponentsProviderMM.template');
process.exit(0);


