import config from '../config'
import path from 'path'
import log from './log'
import fileUtil from '../util/file'
import processor from './Processor'
import events from 'events'

const jobQueueArray = []

const eventEmitter = new events.EventEmitter()

let count = 0

export default {
    startQueue: () => {
        const impositionRequestCount = config.pds.count.imposition
        log.info(`启动转换监控，并行数量: ${impositionRequestCount}`)
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
    log.debug(`编号: ${index}，档案${xmlName}开始进行转换`)

    try {
        await processor.transform(filePath)
    } catch (err) {
        if (err.message) {
            log.error(err.message)
        } else {
            log.error(err)
        }
        return
    } finally {
        fileUtil.removeFile(filePath)
    }
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
    log.debug(`编号: ${index}转换完成，开始新的转换处理`)
})

function delay(s) {
    return new Promise(function (resolve, reject) {
        setTimeout(resolve, s);
    })
}