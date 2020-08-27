import config from '../config'
import fs from 'fs'
import log from '../services/log'
import path from 'path'

const impositionFolder = config.folder.imposition

export function clearImpositionDir() {
    try {
        const files = fs.readdirSync(impositionFolder)
        for (const file of files) {
            try {
                fs.unlinkSync(path.join(impositionFolder, file))
            } catch (err) {
                log.warn(`移除转换中间档案失败。${err.message}`)
            }
        }
    } catch (err) {
        log.warn(`移除转换中间档案失败。${err.message}`)
    }
}