// ios/NetSpeedChecker.mm

#import "NetSpeedChecker.h"

@implementation NetSpeedChecker

// This is the key change. We use RCT_EXPORT_METHOD to explicitly register
// the method with the old bridge, making it foolproof.
RCT_EXPORT_METHOD(checkInternetSpeed:(NSString *)testFileUrl
                  testFileSizeInBytes:(double)testFileSizeInBytes
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    NSTimeInterval timeStamp = [[NSDate date] timeIntervalSince1970];
    NSString *urlString = [NSString stringWithFormat:@"%@?d=%f", testFileUrl, timeStamp];
    NSURL *url = [NSURL URLWithString:urlString];

    if (url == nil) {
        reject(@"INVALID_URL", @"The provided URL is invalid", nil);
        return;
    }

    CFAbsoluteTime startTime = CFAbsoluteTimeGetCurrent();

    [[[NSURLSession sharedSession] dataTaskWithURL:url completionHandler:^(NSData * _Nullable data, NSURLResponse * _Nullable response, NSError * _Nullable error) {
        if (error) {
            reject(@"SPEED_CHECK_FAILED", @"Network request failed", error);
            return;
        }

        CFAbsoluteTime endTime = CFAbsoluteTimeGetCurrent();
        double durationInSeconds = endTime - startTime;

        if (durationInSeconds < 0.01) {
            resolve(@(10000.0));
            return;
        }
        
        double bitsLoaded = testFileSizeInBytes * 8.0;
        double speedBps = bitsLoaded / durationInSeconds;
        double speedKbps = speedBps / 1024.0;
        
        resolve(@(speedKbps));
        
    }] resume];
}

// We still need RCT_EXPORT_MODULE() for the old architecture to even
// see the module in the first place.
RCT_EXPORT_MODULE()

// The getTurboModule function is for the New Architecture. We leave it
// here so the library remains forward-compatible.
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeNetSpeedCheckerSpecJSI>(params);
}

@end