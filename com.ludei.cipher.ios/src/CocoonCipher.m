//
//  CocoonCipher.mm
//
//  Created by Imanol Fernandez @Ludei
//

#import "CocoonCipher.h"
#import <CommonCrypto/CommonCryptor.h>

#define CIPHER_PASSWORD "abcdefghi"

@implementation CocoonCipherPlugin


-(void) pluginInitialize
{
    [NSURLProtocol registerClass:[CocoonCipherInjector class]];
    
    //Canvas+ specific case
    SEL selector = NSSelectorFromString(@"setDecipher:");
    if ([self.webViewEngine respondsToSelector:selector]) {
        [self.webViewEngine performSelector:selector withObject:[NSString stringWithUTF8String:CIPHER_PASSWORD]];
    }
}

@end


@implementation CocoonCipherInjector

+ (BOOL)canInitWithRequest:(NSURLRequest *)request {
    
    if (request.URL.isFileURL) {
        NSURL * url = [request.URL URLByAppendingPathExtension:@"cdf"];
        return [[NSFileManager defaultManager] fileExistsAtPath:url.path];
    }
    
    return NO;
}

+ (NSURLRequest*)canonicalRequestForRequest:(NSURLRequest*)theRequest
{
    return theRequest;
}

- (void)startLoading
{
    NSURL * url = [self.request.URL URLByAppendingPathExtension:@"cdf"];
    NSData * data = [NSData dataWithContentsOfFile:url.path];
    data = [self decipher:data password:[NSString stringWithUTF8String:CIPHER_PASSWORD]];

    NSDictionary * headers = @{
                               @"Content-Length": [NSString stringWithFormat:@"%lu",(unsigned long)[data length]],
                               @"Content-Type": @"text/javascript"
                               };
    
    NSHTTPURLResponse * response = [[NSHTTPURLResponse alloc] initWithURL:[self.request URL] statusCode:200 HTTPVersion:@"1.1" headerFields:headers];
    
    [[self client] URLProtocol:self didReceiveResponse:response cacheStoragePolicy:NSURLCacheStorageNotAllowed];
    [[self client] URLProtocol:self didLoadData:data];
    [[self client] URLProtocolDidFinishLoading:self];
}

- (void)stopLoading
{
    
}

-(NSData*) decipher:(NSData*) data password:(NSString*)password
{
    char keyPtr[kCCKeySizeAES128+1];
    bzero(keyPtr, sizeof(keyPtr));
    [password getCString:keyPtr maxLength:sizeof(keyPtr) encoding:NSUTF8StringEncoding];
    
    NSUInteger dataLength = [data length];
    
    //See the doc: For block ciphers, the output size will always be less than or
    //equal to the input size plus the size of one block.
    //That's why we need to add the size of one block here
    size_t bufferSize = dataLength + kCCBlockSizeAES128;
    void *buffer = malloc(bufferSize);
    
    size_t numBytesDecrypted = 0;
    CCCryptorStatus cryptStatus = CCCrypt(kCCDecrypt, kCCAlgorithmAES128,  kCCOptionPKCS7Padding | kCCOptionECBMode,
                                          keyPtr, kCCKeySizeAES128,
                                          NULL /* initialization vector (optional) */,
                                          [data bytes], dataLength, /* input */
                                          buffer, bufferSize, /* output */
                                          &numBytesDecrypted);
    
    if (cryptStatus == kCCSuccess) {
        //the returned NSData takes ownership of the buffer and will free it on deallocation
        return [NSData dataWithBytesNoCopy:buffer length:numBytesDecrypted];
    }
    
    free(buffer); //free the buffer;
    return nil;
}

@end
