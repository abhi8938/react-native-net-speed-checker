// ios/NetSpeedChecker.mm

#import "NetSpeedChecker.h"

@implementation NetSpeedChecker
RCT_EXPORT_MODULE()

// Delete the 'multiply' method and add this one.
// The method signature is derived from the Spec file.
// React Native maps `Promise` to a resolver and a rejecter block.
- (void)checkInternetSpeed:(NSString *)testFileUrl
       testFileSizeInBytes:(double)testFileSizeInBytes
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
{
    // The actual logic is best written in Swift for safety and modern APIs.
    // This Objective-C++ file will delegate the call to a Swift class.
    // We assume a bridging header is set up to allow this communication.
    
    // Create a URL with a cache-busting parameter
    NSTimeInterval timeStamp = [[NSDate date] timeIntervalSince1970];
    NSString *urlString = [NSString stringWithFormat:@"%@?d=%f", testFileUrl, timeStamp];
    NSURL *url = [NSURL URLWithString:urlString];

    if (url == nil) {
        reject(@"INVALID_URL", @"The provided URL is invalid", nil);
        return;
    }

    // Record the start time
    CFAbsoluteTime startTime = CFAbsoluteTimeGetCurrent();

    // Create the download task
    [[[NSURLSession sharedSession] dataTaskWithURL:url completionHandler:^(NSData * _Nullable data, NSURLResponse * _Nullable response, NSError * _Nullable error) {
        if (error) {
            reject(@"SPEED_CHECK_FAILED", @"Network request failed", error);
            return;
        }

        // Record end time and calculate duration
        CFAbsoluteTime endTime = CFAbsoluteTimeGetCurrent();
        double durationInSeconds = endTime - startTime;

        if (durationInSeconds < 0.01) {
            resolve(@(10000.0)); // Assume high speed
            return;
        }
        
        double bitsLoaded = testFileSizeInBytes * 8.0;
        double speedBps = bitsLoaded / durationInSeconds;
        double speedKbps = speedBps / 1024.0;
        
        // Resolve the promise with the result.
        // The result must be wrapped in an NSNumber.
        resolve(@(speedKbps));
        
    }] resume];
}

// This part is for the New Architecture (Turbo Modules). Leave it as is.
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeNetSpeedCheckerSpecJSI>(params);
}

@end