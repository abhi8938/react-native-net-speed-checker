// ios/NetSpeedChecker.h

#ifdef RCT_NEW_ARCH_ENABLED
// This code will only be used when the New Architecture is enabled
#import <NetSpeedCheckerSpec/NetSpeedCheckerSpec.h>

@interface NetSpeedChecker : NSObject <NativeNetSpeedCheckerSpec>
#else
// This code will be used for all legacy (Old Architecture) projects
#import <React/RCTBridgeModule.h>

@interface NetSpeedChecker : NSObject <RCTBridgeModule>
#endif

@end
