#!/usr/bin/env ruby
require 'json'

# Run after pod install. Makes RCTThirdPartyComponentsProvider match the build:
# Always use nil-safe registration: build an NSMutableDictionary and only setObject
# when NSClassFromString returns non-nil. No NSDictionary literal (avoids nil insert crash).
# When New Arch is OFF this yields an empty dict; when ON it registers only present classes.
#
# Patches RCTThirdPartyComponentsProvider.mm in:
# - ios/ (always)
# - Directories passed as args (BUILD_DIR, OBJROOT, PROJECT_DIR, PODS_ROOT from build phase).
# Explicitly globs ReactCodegen DerivedSources so we patch the file that is actually compiled.

ios_root = File.expand_path(File.join(__dir__, '..', 'ios'))
project_root = File.expand_path(File.join(__dir__, '..'))
props_path = File.join(ios_root, 'Podfile.properties.json')

# ios/, project root (build/generated/ios), and any build-phase args
search_dirs = [ios_root, project_root]
ARGV.each do |arg|
  next if arg.to_s.strip.empty?
  expanded = File.expand_path(arg)
  search_dirs << expanded if Dir.exist?(expanded)
end
# Add Xcode env dirs that might contain the generated .mm (ReactCodegen often uses TARGET_TEMP_DIR).
%w[TARGET_TEMP_DIR TARGET_BUILD_DIR DERIVED_DATA_DIR].each do |k|
  v = ENV[k].to_s.strip
  next if v.empty?
  expanded = File.expand_path(v)
  search_dirs << expanded if Dir.exist?(expanded)
end

# Log search dirs and key env (helps debug when DerivedSources copy isn't found)
puts "[patch-third-party-provider] Search dirs: #{search_dirs.join(', ')}"
%w[TARGET_TEMP_DIR BUILD_DIR OBJROOT PROJECT_DIR PODS_ROOT DERIVED_DATA_DIR SRCROOT].each do |k|
  puts "[patch-third-party-provider]   #{k}=#{ENV[k] || '(not set)'}"
end

# Find every RCTThirdPartyComponentsProvider.mm (avoids missing the copy that gets linked).
# Use broad globs to catch all generated locations: DerivedSources, generated/, Build/, Pods/, etc.
paths = search_dirs.flat_map do |d|
  [
    Dir.glob(File.join(d, '**', 'RCTThirdPartyComponentsProvider.mm')),
    Dir.glob(File.join(d, '**', 'DerivedSources', '**', 'RCTThirdPartyComponentsProvider.mm')),
    Dir.glob(File.join(d, '**', 'generated', '**', 'RCTThirdPartyComponentsProvider.mm')),
    Dir.glob(File.join(d, '**', 'ReactCodegen.build', '**', 'RCTThirdPartyComponentsProvider.mm')),
    Dir.glob(File.join(d, '**', 'Pods', '**', 'RCTThirdPartyComponentsProvider.mm')),
    Dir.glob(File.join(d, '**', 'Build', '**', 'RCTThirdPartyComponentsProvider.mm'))
  ].flatten
end.uniq.sort

if paths.empty?
  puts "[patch-third-party-provider] No RCTThirdPartyComponentsProvider.mm files found under #{search_dirs.join(', ')}"
  exit 0
end

# Whitespace/newline-tolerant match for dispatch_once block (capture token name for variant codegen).
block_regex = /dispatch_once\s*\(\s*&(\w+)\s*,\s*\^\s*\{\s*.*?\s*\}\s*\)\s*;/m

# Unsafe patterns that compile to dictionaryWithObjects:forKeys:count: (nil insert crash):
# 1) Dictionary literal with key/value pairs: thirdPartyComponents = @{ @"key": NSClassFromString(...) }
# 2) Explicit dictionaryWithObjects:forKeys:count: call (rare but possible)
unsafe_literal_regex = /thirdPartyComponents\s*=\s*@\s*\{\s*@"/
unsafe_dict_method_regex = /dictionaryWithObjects\s*:\s*forKeys\s*:\s*count\s*:/m

# Already OK: empty registry literal OR already nil-safe/patched (thirdPartyComponents = [dict copy]; or setObject pattern).
# Must NOT contain any unsafe patterns (dictionaryWithObjects or non-empty literal).
already_ok_regex = /(thirdPartyComponents\s*=\s*@\s*\{\s*\}\s*;|return\s*@\s*\{\s*\}\s*;|thirdPartyComponents\s*=\s*\[dict\s+copy\];|\[dict\s+setObject:_c\s+forKey:)/m

# Proof mode: scripts/.prove-patch or SURFSUP_PROVE_PATCH=1 adds abort() so we can confirm which dylib is linked.
prove_patch = ENV['SURFSUP_PROVE_PATCH'] == '1' || File.exist?(File.join(__dir__, '.prove-patch'))

def patch_one(path, block_regex, already_ok_regex, unsafe_literal_regex, unsafe_dict_method_regex, prove_patch)
  content = File.read(path)
  has_unsafe_literal = unsafe_literal_regex.match?(content)
  has_unsafe_dict_method = unsafe_dict_method_regex.match?(content)
  has_bad = has_unsafe_literal || has_unsafe_dict_method
  puts "[patch-third-party-provider] SCAN path=#{path} has_bad=#{has_bad}"
  # Treat as already_ok when nil-safe and no unsafe patterns remain.
  return :already_ok if already_ok_regex.match?(content) && !has_bad
  block_match = content.match(block_regex)
  return :could_not_patch unless block_match
  token_name = block_match[1]

  # Parse component key/class pairs (literal @{} or existing pattern)
  pairs = content.scan(/@"([^"]+)":\s*NSClassFromString\s*\(\s*@"([^"]+)"\s*\)/).uniq
  pairs = content.scan(/_c = NSClassFromString\(@"([^"]+)"\); if \(_c\) \[dict setObject:_c forKey:@"([^"]+)"/).map { |cls, key| [key, cls] }.uniq if pairs.empty?

  lines = [
    '    NSMutableDictionary<NSString *, Class<RCTComponentViewProtocol> > *dict = [NSMutableDictionary new];',
    '    Class _c = nil;'
  ]
  lines.unshift('    abort(); /* TEMPORARY: proves this file is linked; remove scripts/.prove-patch */;') if prove_patch
  pairs.each do |key, cls|
    lines << "\t\t_c = NSClassFromString(@\"#{cls}\"); if (_c) [dict setObject:_c forKey:@\"#{key}\"];"
  end
  lines << '    thirdPartyComponents = [dict copy];'

  replacement = <<~BLOCK.strip
  dispatch_once(&#{token_name}, ^{
#{lines.join("\n")}
  });
BLOCK

  new_content = content.sub(block_regex, replacement)
  return :could_not_patch if new_content == content
  File.write(path, new_content)
  :patched
end

patched = []
already_ok = []
could_not = []
paths.each do |path|
  result = patch_one(path, block_regex, already_ok_regex, unsafe_literal_regex, unsafe_dict_method_regex, prove_patch)
  case result
  when :patched
    patched << path
    puts "[patch-third-party-provider] Patched: #{path}"
  when :already_ok
    already_ok << path
    puts "[patch-third-party-provider] Already OK: #{path}"
  else
    could_not << path
    warn "[patch-third-party-provider] Could not patch: #{path}"
  end
end

puts "[patch-third-party-provider] Found #{paths.size} file(s), patched #{patched.size}, already OK #{already_ok.size}, could not patch #{could_not.size}."

# Safety check: verify no unsafe patterns remain in patched/already_ok files.
# If any file still has dictionaryWithObjects patterns, the build will crash.
files_with_bad = []
(patched + already_ok).each do |path|
  content = File.read(path)
  has_bad = unsafe_literal_regex.match?(content) || unsafe_dict_method_regex.match?(content)
  files_with_bad << path if has_bad
end

if files_with_bad.any?
  warn "[patch-third-party-provider] ERROR: Found #{files_with_bad.size} file(s) with unsafe dictionaryWithObjects patterns after patching:"
  files_with_bad.each { |p| warn "  #{p}" }
  unless ENV['SURFSUP_SKIP_SAFETY_CHECK'] == '1'
    warn "[patch-third-party-provider] Build will crash. Set SURFSUP_SKIP_SAFETY_CHECK=1 to override."
    exit 1
  end
end

# Fail only if we found provider files but none were patched or already OK
exit 1 if paths.any? && patched.empty? && already_ok.empty?
exit 0
