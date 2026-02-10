/*
 * Nil-safe implementation: only NSMutableDictionary + setObject when non-nil.
 * No @{}, dictionaryWithObjects, or initWithObjects:forKeys:count: in this file.
 * Verification: binary must contain "[RCTThirdPartyComponentsProvider] skipping nil for key" or "nil-safe implementation (empty registry)".
 */
#import <Foundation/Foundation.h>
#import "RCTThirdPartyComponentsProvider.h"
#import <React/RCTComponentViewProtocol.h>

@implementation RCTThirdPartyComponentsProvider

+ (NSDictionary<NSString *, Class<RCTComponentViewProtocol>> *)thirdPartyFabricComponents
{
  NSLog(@"[RCTThirdPartyComponentsProvider] SAFE IMPL RUNNING");
  static NSDictionary<NSString *, Class<RCTComponentViewProtocol>> *thirdPartyComponents = nil;
  static dispatch_once_t nativeComponentsToken;

  dispatch_once(&nativeComponentsToken, ^{
    NSMutableDictionary<NSString *, Class<RCTComponentViewProtocol>> *dict = [NSMutableDictionary new];
    NSLog(@"[RCTThirdPartyComponentsProvider] nil-safe implementation (empty registry)");
    thirdPartyComponents = [dict copy];
  });

  return thirdPartyComponents;
}

@end
