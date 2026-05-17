import { z } from "zod"
import { baseDownloadConfig } from "@/src/lib/data/streams/definitions"
import { globalPlatformConfig } from "@/src/lib/data/platform/definitions"

export const xiaohongshuGlobalConfig = globalPlatformConfig

export const xiaohongshuDownloadConfig = baseDownloadConfig.merge(xiaohongshuGlobalConfig)

export type XiaohongshuGlobalConfig = z.infer<typeof xiaohongshuGlobalConfig>
export type XiaohongshuDownloadConfig = z.infer<typeof xiaohongshuDownloadConfig>
