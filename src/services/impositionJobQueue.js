import config from '../config'
import fs from 'fs'
import path from 'path'
import log from './log'
import xmlConvert from 'xml2js'
import fileUtil from '../util/file'
import processor from './Processor'
import events from 'events'

const jobQueueArray = []
const errorFolder = config.folder.inputError

const eventEmitter = new events.EventEmitter()

export default {
    startQueue: () => {
        const impositionRequestCount = config.pds.count.imposition
        log.info(`启动落版监控，并行数量: ${impositionRequestCount}`)
        for (let i = 0; i < impositionRequestCount; i++) {
            eventEmitter.emit('watchJobQueue', i)
        }
    },
    pushElement: element => {
        jobQueueArray.push(element)
    }
}

async function startViewQueue(index) {
    if (jobQueueArray.length === 0) {
        await delay(5000)
        return
    }

    let filePath = jobQueueArray.shift()
    let xmlName = path.basename(filePath)
    log.debug(`编号: ${index}，档案${xmlName}开始进行落版`)
    let originalFolder = path.dirname(filePath)
    let accData
    try {
        let xmlData = fs.readFileSync(filePath)
        accData = await xmlConvert.parseStringPromise(xmlData)
    } catch (err) {
        log.error(`${xmlName}载入或转换失败`)
        try {
            moveFileToErrorDir(xmlName, originalFolder, errorFolder)
        } catch (err) {
            if (err.message) {
                log.error(err.message)
            } else {
                log.error(err)
            }
        }
        return
    }

    try {
        await processor.imposition(filePath, accData)
    } catch (err) {
        if (err.message) {
            log.error(err.message)
        } else {
            log.error(err)
        }
        return
    }
}

function moveFileToErrorDir(fileName, originalDir, ProcessedDir) {
    fileUtil.moveFile(`${originalDir}/${fileName}`, `${ProcessedDir}/${fileName}`)
}

eventEmitter.on('watchJobQueue', async function (index) {
    try {
        await startViewQueue(index)
    } catch (err) {
        if (err.message) {
            log.error(err.message)
        } else {
            log.error(err)
        }
    }
    eventEmitter.emit('watchJobQueue', index)
    log.debug(`编号: ${index}落版完成，开始新的落版处理`)
})

function delay(s) {
    return new Promise(function (resolve, reject) {
        setTimeout(resolve, s);
    })
}