// ios/NetSpeedChecker.h

#import <React/RCTBridgeModule.h> // Import this for promise types
#import <NetSpeedCheckerSpec/NetSpeedCheckerSpec.h>

@interface NetSpeedChecker : NSObject <NativeNetSpeedCheckerSpec>

// Add this method declaration. It must exactly match the implementation.
- (void)checkInternetSpeed:(NSString *)testFileUrl
       testFileSizeInBytes:(double)testFileSizeInBytes
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject;

@end