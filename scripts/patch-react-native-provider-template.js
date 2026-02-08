#!/usr/bin/env node
/**
 * Permanent fix for RCTThirdPartyComponentsProvider crash when New Arch is OFF.
 * Patches the React Native codegen template so the generated .mm always uses a
 * nil-safe empty registry (no NSDictionary literal with NSClassFromString),
 * avoiding nil insert crash in dictionaryWithObjects:forKeys:count:.
 *
 * Run on postinstall so every npm install gets the fix.
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

// Already patched
if (content.includes('(void)_c;') && !content.includes('{thirdPartyComponentsMapping}')) {
  process.exit(0);
}

// Replace the dispatch_once block with nil-safe version (no mapping — empty registry when New Arch OFF)
const unsafeBlock = `  dispatch_once(&nativeComponentsToken, ^{
    NSMutableDictionary<NSString *, Class<RCTComponentViewProtocol> > *dict = [NSMutableDictionary new];
    Class _c = nil;
{thirdPartyComponentsMapping}
    thirdPartyComponents = [dict copy];
  });`;

const safeBlock = `  dispatch_once(&nativeComponentsToken, ^{
    /* surfSUP: nil-safe empty registry when New Arch is OFF; avoids nil-insert crash in dict literal */
    NSMutableDictionary<NSString *, Class<RCTComponentViewProtocol> > *dict = [NSMutableDictionary new];
    Class _c = nil;
    (void)_c;
    thirdPartyComponents = [dict copy];
  });`;

if (!content.includes(unsafeBlock)) {
  console.warn('[surfSUP] Template format changed, cannot patch RCTThirdPartyComponentsProviderMM.template');
  process.exit(0);
}

content = content.replace(unsafeBlock, safeBlock);
fs.writeFileSync(templatePath, content);
console.log('[surfSUP] Patched RCTThirdPartyComponentsProviderMM.template (permanent RCTThirdPartyComponentsProvider fix)');
