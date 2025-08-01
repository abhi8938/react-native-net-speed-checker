// react-native-net-speed-checker/android/src/main/java/com/netspeedchecker/NetSpeedCheckerPackage.kt

package com.netspeedchecker

// Import the correct, classic interfaces
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import java.util.ArrayList

// Implement the standard ReactPackage interface instead of BaseReactPackage
class NetSpeedCheckerPackage : ReactPackage {
    
    // This method is required by the ReactPackage interface
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        val modules: MutableList<NativeModule> = ArrayList()
        // Add your module to the list
        modules.add(NetSpeedCheckerModule(reactContext))
        return modules
    }

    // This method is also required, but we can return an empty list
    // because your library doesn't have any UI components (ViewManagers).
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}