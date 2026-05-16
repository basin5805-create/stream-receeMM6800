/*
 * MIT License
 *
 * Stream-rec  https://github.com/hua0512/stream-rec
 *
 * Copyright (c) 2024 hua0512 (https://github.com/hua0512)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

package github.hua0512.utils

import io.ktor.http.Url
import java.net.InetSocketAddress
import java.net.Proxy
import java.net.ProxySelector
import java.net.URI

data class ProxySettings(
  val envName: String,
  val rawUrl: String,
  val url: Url,
  val type: Proxy.Type,
)

fun shouldBypassProxy(targetUrl: String?): Boolean {
  if (targetUrl.isNullOrBlank()) return false
  val host = runCatching { Url(targetUrl).host }.getOrNull()
    ?: runCatching { URI(targetUrl).host }.getOrNull()
  return shouldBypassProxyHost(host)
}

fun shouldBypassProxyHost(host: String?): Boolean {
  val normalizedHost = host?.trim()?.lowercase()?.trimEnd('.') ?: return false
  if (normalizedHost.isEmpty()) return false

  return getNoProxyEntries().any { entry ->
    when {
      entry == "*" -> true
      entry == normalizedHost -> true
      entry.startsWith(".") -> normalizedHost.endsWith(entry)
      else -> normalizedHost == entry || normalizedHost.endsWith(".$entry")
    }
  }
}

fun getFfmpegProxyUrl(targetUrl: String?): String? {
  if (shouldBypassProxy(targetUrl)) return null
  return System.getenv("HTTPS_PROXY")
    ?: System.getenv("HTTP_PROXY")
}

fun createProxySelectorFromEnv(): ProxySelector? {
  val settings = getProxySettings() ?: return null
  val proxy = Proxy(settings.type, InetSocketAddress(settings.url.host, settings.url.port))

  return object : ProxySelector() {
    override fun select(uri: URI?): MutableList<Proxy> {
      if (uri == null || shouldBypassProxyHost(uri.host)) {
        return mutableListOf(Proxy.NO_PROXY)
      }
      return mutableListOf(proxy)
    }

    override fun connectFailed(uri: URI?, sa: java.net.SocketAddress?, ioe: java.io.IOException?) = Unit
  }
}

fun getProxySettings(): ProxySettings? {
  val candidates = listOf(
    "HTTP_PROXY" to Proxy.Type.HTTP,
    "HTTPS_PROXY" to Proxy.Type.HTTP,
    "SOCKS_PROXY" to Proxy.Type.SOCKS,
  )

  for ((envName, type) in candidates) {
    val rawUrl = System.getenv(envName)?.takeIf { it.isNotBlank() } ?: continue
    val url = runCatching { Url(rawUrl) }.getOrNull() ?: continue
    return ProxySettings(envName, rawUrl, url, type)
  }

  return null
}

private fun getNoProxyEntries(): List<String> {
  return sequenceOf("NO_PROXY", "no_proxy")
    .mapNotNull { System.getenv(it) }
    .flatMap { it.split(',').asSequence() }
    .map { it.trim().substringBefore(':').lowercase() }
    .filter { it.isNotEmpty() }
    .toList()
}
