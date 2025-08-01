// ios/NetSpeedChecker.mm

#import "NetSpeedChecker.h"

@implementation NetSpeedChecker
RCT_EXPORT_MODULE()
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

    NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];
    request.timeoutInterval = 5.0;

    CFAbsoluteTime startTime = CFAbsoluteTimeGetCurrent();

    [[[NSURLSession sharedSession] dataTaskWithRequest:request completionHandler:^(NSData * _Nullable data, NSURLResponse * _Nullable response, NSError * _Nullable error) {
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


#if RCT_NEW_ARCH_ENABLED
// Only compile this boilerplate for New Architecture projects
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeNetSpeedCheckerSpecJSI>(params);
}
#endif

@end
