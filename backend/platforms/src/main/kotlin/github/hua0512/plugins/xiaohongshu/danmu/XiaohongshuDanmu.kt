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

package github.hua0512.plugins.xiaohongshu.danmu

import github.hua0512.app.App
import github.hua0512.data.media.DanmuDataWrapper
import github.hua0512.data.media.DanmuDataWrapper.DanmuData
import github.hua0512.data.media.DanmuDataWrapper.EndOfDanmu
import github.hua0512.data.stream.Streamer
import github.hua0512.plugins.danmu.base.Danmu
import io.ktor.http.*
import io.ktor.websocket.*
import kotlinx.datetime.Instant
import kotlinx.serialization.json.*

class XiaohongshuDanmu(app: App) : Danmu(app, enablePing = false) {

  companion object {
    private const val WS_URL = "wss://apppush-rws.xiaohongshu.com/rwp"
    private const val APP_ID = "xhs-pc"
    private const val BIZ_NAME = "live"
    private const val URL_REGEX = """https?://(?:www\.)?xiaohongshu\.com/(?:hina/)?livestream/(?:[^/?#]+/)?(\d+)"""

    // RwpPacketType
    private const val PACKET_PING = 0
    private const val PACKET_PONG = 128
    private const val PACKET_AUTH = 1
    private const val PACKET_AUTH_ACK = 129
    private const val PACKET_SIGNAL = 2
    private const val PACKET_MESSAGE_DOWN = 4
    private const val PACKET_BIND = 5
    private const val PACKET_BIND_ACK = 133
    private const val PACKET_VIRTUAL_LINK = 8
    private const val PACKET_VIRTUAL_LINK_ACK = 136
    private const val PACKET_REGISTE_EVENT = 9
    private const val PACKET_REGISTE_EVENT_ACK = 153

    // SignalType
    private const val SIGNAL_LOGIN = 0
    private const val SIGNAL_BIZ_REGISTER = 1
    private const val SIGNAL_JOIN_ROOM = 8
    private const val SIGNAL_LEAVE_ROOM = 9

    // AckMode
    private const val ACK_IMMEDIATELY = 1

    // RWP version
    private const val RWP_VERSION = 1

    // Live message types (from nb in JS)
    private const val MSG_TYPE_TEXT = "Text"
    private const val MSG_TYPE_AUDIENCE_JOIN_V2 = "AudienceJoinV2"
    private const val MSG_TYPE_SHARE = "Share"
    private const val MSG_TYPE_FOLLOW = "FollowEmcee"
    private const val MSG_TYPE_LIGHT = "Light"
    private const val MSG_TYPE_REFRESH = "Refresh"
    private const val MSG_TYPE_DISMISS = "Dismiss"
  }

  override var websocketUrl: String = WS_URL

  override val heartBeatDelay: Long = 30000

  override val heartBeatPack: ByteArray = buildJsonFrame(
    mapOf("v" to RWP_VERSION, "t" to PACKET_PING)
  ).toByteArray()

  private var roomId: String = ""
  private var cookies: String = ""
  private var messageIdCounter: Long = 0
  private var authenticated = false
  private var joinedRoom = false

  override suspend fun initDanmu(streamer: Streamer, startTime: Instant): Boolean {
    val regex = URL_REGEX.toRegex()
    roomId = regex.find(streamer.url)?.groupValues?.get(1) ?: run {
      logger.error("Failed to extract roomId from URL: ${streamer.url}")
      return false
    }

    cookies = (streamer.downloadConfig?.cookies?.ifEmpty { null }
      ?: app.config.xiaohongshuConfig.cookies)
      ?: ""

    if (cookies.isEmpty()) {
      logger.warn("(${streamer.name}) No XHS cookie provided, danmu auth will likely fail")
    }

    messageIdCounter = System.currentTimeMillis()
    headersMap[HttpHeaders.Cookie] = cookies
    headersMap[HttpHeaders.Origin] = "https://www.xiaohongshu.com"
    headersMap[HttpHeaders.Host] = "apppush-rws.xiaohongshu.com"

    logger.info("(${streamer.name}) XHS danmu initialized, roomId: $roomId")
    return true
  }

  override fun oneHello(): ByteArray = ByteArray(0)

  override fun onDanmuRetry(retryCount: Int) {
    authenticated = false
    joinedRoom = false
  }

  override suspend fun decodeDanmu(session: WebSocketSession, data: ByteArray): List<DanmuDataWrapper?> {
    val text = data.decodeToString()
    val packet = try {
      Json.parseToJsonElement(text).jsonObject
    } catch (e: Exception) {
      logger.debug("Failed to parse XHS danmu packet: ${e.message}")
      return emptyList()
    }

    val packetType = packet["t"]?.jsonPrimitive?.intOrNull ?: return emptyList()

    return when (packetType) {
      PACKET_PONG -> {
        logger.trace("XHS danmu PONG received")
        emptyList()
      }

      PACKET_AUTH_ACK -> {
        handleAuthResult(packet, text, session)
        emptyList()
      }

      PACKET_SIGNAL -> {
        handleSignalResponse(packet, text, session)
        emptyList()
      }

      PACKET_BIND_ACK -> {
        logger.debug("XHS danmu BIND_ACK received")
        emptyList()
      }

      PACKET_VIRTUAL_LINK_ACK -> {
        logger.debug("XHS danmu VIRTUAL_LINK_ACK received")
        emptyList()
      }

      PACKET_REGISTE_EVENT_ACK -> {
        logger.debug("XHS danmu REGISTE_EVENT_ACK received")
        emptyList()
      }

      PACKET_MESSAGE_DOWN -> {
        parseMessageDown(packet)
      }

      else -> {
        logger.debug("XHS danmu unknown packet type: $packetType, data: $text")
        emptyList()
      }
    }
  }

  override suspend fun sendHello(session: WebSocketSession) {
    sendLogin(session)
  }

  private suspend fun handleAuthResult(packet: JsonObject, text: String, session: WebSocketSession) {
    val code = packet.navigate("b", "d", "b", "code")?.jsonPrimitive?.intOrNull
    if (code == 0) {
      onAuthSuccess(packet, session)
    } else {
      logger.error("XHS danmu AUTH_ACK failed, code: $code, response: $text")
    }
  }

  private suspend fun handleSignalResponse(packet: JsonObject, text: String, session: WebSocketSession) {
    val signalType = packet.navigate("b", "d", "s")?.jsonPrimitive?.intOrNull
    val ackCode = packet.navigate("b", "a", "c")?.jsonPrimitive?.intOrNull

    // LOGIN response comes as SIGNAL with b.a.c code
    if (!authenticated && signalType == null && ackCode != null) {
      if (ackCode == 0) {
        onAuthSuccess(packet, session)
      } else {
        logger.error("XHS danmu LOGIN failed, ackCode: $ackCode, response: $text")
      }
      return
    }

    // Signal ACK responses
    if (ackCode != null && ackCode != 0) {
      logger.warn("XHS danmu signal NACK, signal=$signalType code=$ackCode")
    }

    logger.debug("XHS danmu SIGNAL response, signalType=$signalType, data: ${text.take(200)}")
  }

  private suspend fun onAuthSuccess(packet: JsonObject, session: WebSocketSession) {
    authenticated = true
    logger.info("XHS danmu AUTH succeeded, sending BIZ_REGISTER + JOIN_ROOM...")
    sendBizRegister(session)
    sendJoinRoom(session)
    joinedRoom = true
  }

  private suspend fun sendLogin(session: WebSocketSession) {
    val deviceId = generateDeviceId()
    val payload = buildJsonObject {
      put("appId", APP_ID)
      put("authInfo", cookies)
      put("deviceInfo", buildJsonObject {
        put("deviceId", deviceId)
        put("deviceName", "Chrome")
        put("appVersion", "131.0.0.0")
        put("userAgent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
      })
      put("serviceTag", "")
      put("bizInfos", buildJsonArray {})
      put("roomInfo", JsonNull)
    }

    val frame = buildSignalFrame(SIGNAL_LOGIN, payload)
    session.send(frame.toByteArray())
    logger.debug("XHS danmu LOGIN sent")
  }

  private suspend fun sendBizRegister(session: WebSocketSession) {
    val payload = buildJsonObject {
      put("bizInfo", buildJsonObject {
        put("bizName", BIZ_NAME)
        put("serializeType", 0)
      })
      put("register", 1)
    }

    val frame = buildSignalFrame(SIGNAL_BIZ_REGISTER, payload)
    session.send(frame.toByteArray())
    logger.debug("XHS danmu BIZ_REGISTER sent")
  }

  private suspend fun sendJoinRoom(session: WebSocketSession) {
    val payload = buildJsonObject {
      put("info", buildJsonObject {
        put("bizName", BIZ_NAME)
        put("roomId", roomId)
        put("roomType", 1)
      })
    }

    val frame = buildSignalFrame(SIGNAL_JOIN_ROOM, payload)
    session.send(frame.toByteArray())
    logger.info("XHS danmu JOIN_ROOM sent, roomId: $roomId")
  }

  private fun buildSignalFrame(signalType: Int, payload: JsonObject): String {
    messageIdCounter++
    return buildJsonObject {
      put("v", RWP_VERSION)
      put("t", PACKET_SIGNAL)
      put("m", messageIdCounter)
      put("b", buildJsonObject {
        put("d", buildJsonObject {
          put("a", ACK_IMMEDIATELY)
          put("s", signalType)
          put("b", payload)
        })
      })
    }.toString()
  }

  private fun buildJsonFrame(fields: Map<String, Any>): String {
    return buildJsonObject {
      fields.forEach { (k, v) ->
        when (v) {
          is Int -> put(k, v)
          is Long -> put(k, v)
          is String -> put(k, v)
          is Boolean -> put(k, v)
        }
      }
    }.toString()
  }

  private fun parseMessageDown(packet: JsonObject): List<DanmuDataWrapper?> {
    val body = packet.navigate("b", "d", "b")?.jsonObject ?: return emptyList()
    val topic = body["topic"]?.jsonPrimitive?.contentOrNull ?: return emptyList()

    if (!topic.startsWith("live:") && !topic.contains("chat") && !topic.contains("comment")) {
      return emptyList()
    }

    val payloadStr = body["payload"]?.jsonPrimitive?.contentOrNull ?: return emptyList()
    val payload = try {
      Json.parseToJsonElement(payloadStr).jsonObject
    } catch (e: Exception) {
      logger.debug("Failed to parse XHS danmu payload: ${e.message}")
      return emptyList()
    }

    val msgType = payload["type"]?.jsonPrimitive?.contentOrNull ?: return emptyList()

    return when (msgType) {
      MSG_TYPE_TEXT -> {
        val profile = payload["profile"]?.jsonObject
        val userId = profile?.get("user_id")?.jsonPrimitive?.longOrNull ?: 0L
        val nickname = profile?.get("nickname")?.jsonPrimitive?.contentOrNull ?: ""
        val content = payload["content"]?.jsonPrimitive?.contentOrNull ?: ""
        val timestamp = payload["timestamp"]?.jsonPrimitive?.longOrNull
          ?: System.currentTimeMillis()

        if (content.isNotEmpty()) {
          listOf(DanmuData(
            uid = userId,
            sender = nickname,
            color = -1,
            content = content,
            fontSize = 25,
            serverTime = timestamp,
          ))
        } else emptyList()
      }

      MSG_TYPE_DISMISS -> {
        logger.info("XHS danmu DISMISS received, ending danmu")
        listOf(EndOfDanmu)
      }

      else -> emptyList()
    }
  }

  private fun generateDeviceId(): String {
    val chars = "abcdef0123456789"
    return (1..32).map { chars.random() }.joinToString("")
  }

  private fun JsonObject.navigate(vararg keys: String): JsonElement? {
    var current: JsonElement = this
    for (key in keys) {
      current = (current as? JsonObject)?.get(key) ?: return null
    }
    return current
  }
}
