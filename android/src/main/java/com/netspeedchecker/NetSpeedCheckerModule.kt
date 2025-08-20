// android/src/main/java/com/netspeedchecker/NetSpeedCheckerModule.kt

package com.netspeedchecker

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.bridge.Promise // Import Promise
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.IOException
// Import TimeUnit
import java.util.concurrent.TimeUnit

@ReactModule(name = NetSpeedCheckerModule.NAME)
class NetSpeedCheckerModule(reactContext: ReactApplicationContext) :
  NativeNetSpeedCheckerSpec(reactContext) {

  override fun getName(): String {
    return NAME
  }


private val client = OkHttpClient.Builder()
    .callTimeout(5, TimeUnit.SECONDS) // Total timeout for the entire call
    .connectTimeout(1, TimeUnit.SECONDS) // Timeout for establishing a connection
    .build()

 
  override fun checkInternetSpeed(testFileUrl: String, testFileSizeInBytes: Double, promise: Promise) {
      val request = Request.Builder()
          .url("$testFileUrl?d=${System.currentTimeMillis()}") // Cache buster
          .build()
      val startTime = System.currentTimeMillis()

      client.newCall(request).enqueue(object : okhttp3.Callback {
          override fun onFailure(call: okhttp3.Call, e: IOException) {
              promise.reject("SPEED_CHECK_FAILED", e)
          }

          override fun onResponse(call: okhttp3.Call, response: okhttp3.Response) {
              response.use { res ->
                  if (!res.isSuccessful) {
                      promise.reject("SPEED_CHECK_FAILED", "Server responded with status: ${res.code}")
                      return
                  }

                  res.body?.bytes() // Consume the body to ensure it's fully downloaded

                  val endTime = System.currentTimeMillis()
                  val durationInSeconds = (endTime - startTime) / 1000.0

                  if (durationInSeconds < 0.01) { // Avoid division by zero or inaccurate measures
                      promise.resolve(10000.0) // Assume high speed
                      return
                  }

                  val bitsLoaded = testFileSizeInBytes * 8
                  val speedBps = bitsLoaded / durationInSeconds
                  val speedKbps = speedBps / 1024.0

                  promise.resolve(speedKbps)
              }
          }
      })
  }

  companion object {
    const val NAME = "NetSpeedChecker"
  }
}