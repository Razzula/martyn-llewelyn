package io.github.razzula.martyn_llewelyn.plugin

import app.tauri.annotation.*
import app.tauri.plugin.*
import android.app.Activity
import android.content.Context
import android.util.Base64
import android.content.SharedPreferences

private const val SHARED_PREFERENCES_NAME = "secure_storage"

@InvokeArg
class StoreRequest {
    lateinit var value: String
}

@TauriPlugin
class KeystorePlugin(private val activity: Activity) : Plugin(activity) {

    @Command
    fun fetch(invoke: Invoke) {
        try {
            val prefs: SharedPreferences =
                activity.getSharedPreferences(SHARED_PREFERENCES_NAME, Context.MODE_PRIVATE)
            val stored = prefs.getString("mock_key", null)

            if (stored == null) {
                invoke.reject("No value stored")
                return
            }

            val result = JSObject()
            result.put("value", stored)
            invoke.resolve(result)
        } catch (e: Exception) {
            invoke.reject(e.message ?: "Unknown error")
        }
    }

    @Command
    fun store(invoke: Invoke) {
        try {
            val req = invoke.parseArgs(StoreRequest::class.java)
            val prefs: SharedPreferences =
                activity.getSharedPreferences(SHARED_PREFERENCES_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString("mock_key", req.value).apply()
            invoke.resolve()
        } catch (e: Exception) {
            invoke.reject(e.message ?: "Unknown error")
        }
    }
}
