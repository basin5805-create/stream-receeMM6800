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

package github.hua0512.plugins.xiaohongshu.download

import github.hua0512.data.media.MediaInfo
import github.hua0512.data.media.VideoFormat
import github.hua0512.data.stream.StreamInfo
import github.hua0512.plugins.base.Extractor
import io.ktor.client.*
import io.ktor.client.plugins.timeout
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import kotlinx.serialization.json.*
import java.util.concurrent.TimeUnit

class XiaohongshuExtractor(http: HttpClient, json: Json, override val url: String) : Extractor(http, json) {

  companion object {
    private const val URL_REGEX = """https?://(?:www\.)?xiaohongshu\.com/(?:hina/)?livestream/(?:[^/?#]+/)?(\d+)"""
    private const val SHARE_INFO_API = "https://www.xiaohongshu.com/api/sns/red/live/app/v1/ecology/outside/share_info"
    private const val XHS_LIVE_SITE = "https://www.xiaohongshu.com"
    private const val FLV_CDN_HOST = "http://live.xhscdn.com/live/"
    private const val SIGNED_HELPER_PATH = "/app/scripts/xhs_live_room.py"
  }

  override val regexPattern: Regex = URL_REGEX.toRegex()

  private lateinit var roomId: String
  private val useSignedHelper = System.getenv("XHS_USE_SIGNED_HELPER") == "true"

  init {
    platformHeaders[HttpHeaders.Referrer] = XHS_LIVE_SITE
  }

  override fun match(): Boolean {
    roomId = regexPattern.find(url)?.groupValues?.get(1) ?: return false
    return true
  }

  override suspend fun isLive(): Boolean {
    return try {
      val apiUrl = "$SHARE_INFO_API?room_id=$roomId"
      val apiResponse = getResponse(apiUrl) {
        timeout { requestTimeoutMillis = 10000 }
      }
      if (apiResponse.status == HttpStatusCode.OK) {
        val body = apiResponse.bodyAsText()
        val jsonObj = json.parseToJsonElement(body).jsonObject
        val code = jsonObj["code"]?.jsonPrimitive?.intOrNull ?: -1
        val status = jsonObj["data"]?.jsonObject?.get("room")?.jsonObject?.get("status")?.jsonPrimitive?.intOrNull ?: -1
        code == 0 && status == 0
      } else false
    } catch (e: Exception) {
      logger.warn("$url isLive check failed: ${e.message}", e)
      false
    }
  }

  override suspend fun extract(): MediaInfo {
    var title = ""
    var artist = ""
    var coverUrl = ""
    var artistImageUrl = ""
    var flvUrl = "${FLV_CDN_HOST}${roomId}.flv"
    var liveStatus = false

    if (useSignedHelper) {
      val signedResult = fetchSignedRoomInfo()
      if (signedResult != null) {
        title = signedResult.title
        artist = signedResult.artist
        coverUrl = signedResult.coverUrl
        artistImageUrl = signedResult.artistImageUrl
        liveStatus = signedResult.live
        if (liveStatus && signedResult.streams.isNotEmpty()) {
          return MediaInfo(
            XHS_LIVE_SITE,
            title,
            artist,
            coverUrl,
            artistImageUrl,
            liveStatus,
            signedResult.streams,
          )
        }
      }
    }

    // get metadata and stream URL from share_info API
    try {
      val apiUrl = "$SHARE_INFO_API?room_id=$roomId"
      val apiResponse = getResponse(apiUrl) {
        timeout { requestTimeoutMillis = 10000 }
      }
      if (apiResponse.status == HttpStatusCode.OK) {
        val body = apiResponse.bodyAsText()
        val jsonObj = json.parseToJsonElement(body).jsonObject
        logger.info("$url share_info API response code=${jsonObj["code"]}, status=${jsonObj["data"]?.jsonObject?.get("room")?.jsonObject?.get("status")}")
        if (jsonObj["code"]?.jsonPrimitive?.intOrNull == 0) {
          val data = jsonObj["data"]?.jsonObject
          val hostInfo = data?.get("host_info")?.jsonObject
          val roomInfo = data?.get("room")?.jsonObject
          artist = hostInfo?.get("nickname")?.jsonPrimitive?.contentOrNull ?: ""
          artistImageUrl = hostInfo?.get("avatar")?.jsonPrimitive?.contentOrNull ?: ""
          title = roomInfo?.get("name")?.jsonPrimitive?.contentOrNull ?: ""
          coverUrl = roomInfo?.get("cover")?.jsonPrimitive?.contentOrNull ?: ""
          liveStatus = roomInfo?.get("status")?.jsonPrimitive?.intOrNull == 0
          logger.info("$url extract result: liveStatus=$liveStatus, title=$title, artist=$artist, flvUrl=$flvUrl")

          // extract flvUrl from live_link deep link
          val liveLink = roomInfo?.get("live_link")?.jsonPrimitive?.contentOrNull ?: ""
          val flvMatch = """flvUrl=([^&]+)""".toRegex().find(liveLink)
          if (flvMatch != null) {
            flvUrl = flvMatch.groupValues[1].replace("%3A", ":").replace("%2F", "/")
          }
        }
      }
    } catch (e: Exception) {
      logger.warn("$url share_info API failed: ${e.message}", e)
    }

    val mediaInfo = MediaInfo(XHS_LIVE_SITE, title, artist, coverUrl, artistImageUrl, liveStatus)

    if (!liveStatus) return mediaInfo

    val streams = listOf(
      StreamInfo(flvUrl, VideoFormat.flv, "原画", 0)
    )

    return mediaInfo.copy(streams = streams)
  }

  private fun fetchSignedRoomInfo(): SignedRoomInfo? {
    if (cookies.isBlank()) {
      return null
    }
    return try {
      val output = runSignedHelper()
      val result = json.parseToJsonElement(output).jsonObject
      if (result["ok"]?.jsonPrimitive?.booleanOrNull != true) {
        logger.warn("$url signed live-room helper failed: ${result["error"]?.jsonPrimitive?.contentOrNull ?: output}")
        return null
      }
      val streams = result["streams"]?.jsonArray?.mapNotNull { parseSignedStream(it.jsonObject) }.orEmpty()
      SignedRoomInfo(
        title = result["title"]?.jsonPrimitive?.contentOrNull ?: "",
        artist = result["artist"]?.jsonPrimitive?.contentOrNull ?: "",
        coverUrl = result["coverUrl"]?.jsonPrimitive?.contentOrNull ?: "",
        artistImageUrl = result["artistImageUrl"]?.jsonPrimitive?.contentOrNull ?: "",
        live = result["live"]?.jsonPrimitive?.booleanOrNull == true,
        streams = streams,
      )
    } catch (e: Exception) {
      logger.warn("$url signed live-room helper error: ${e.message}", e)
      null
    }
  }

  private fun runSignedHelper(): String {
    val process = ProcessBuilder(
      "python3",
      SIGNED_HELPER_PATH,
      "--room-id",
      roomId,
      "--cookies",
      cookies,
    )
      .redirectErrorStream(true)
      .start()

    if (!process.waitFor(30, TimeUnit.SECONDS)) {
      process.destroyForcibly()
      throw IllegalStateException("signed live-room helper timed out")
    }

    val output = process.inputStream.bufferedReader().use { it.readText() }.trim()
    if (process.exitValue() != 0 && output.isBlank()) {
      throw IllegalStateException("signed live-room helper exited with code ${process.exitValue()}")
    }
    return output
  }

  private fun parseSignedStream(stream: JsonObject): StreamInfo? {
    val streamUrl = stream["url"]?.jsonPrimitive?.contentOrNull ?: return null
    val format = when (stream["format"]?.jsonPrimitive?.contentOrNull?.lowercase()) {
      "hls", "m3u8" -> VideoFormat.hls
      else -> VideoFormat.flv
    }
    return StreamInfo(
      url = streamUrl,
      format = format,
      quality = stream["quality"]?.jsonPrimitive?.contentOrNull ?: "原画",
      bitrate = stream["bitrate"]?.jsonPrimitive?.longOrNull ?: 0L,
      priority = stream["priority"]?.jsonPrimitive?.intOrNull ?: 0,
    )
  }

  private data class SignedRoomInfo(
    val title: String,
    val artist: String,
    val coverUrl: String,
    val artistImageUrl: String,
    val live: Boolean,
    val streams: List<StreamInfo>,
  )
}
