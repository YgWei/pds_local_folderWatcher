import config from '../config'
import log from './log'
import processor from './Processor'
import events from 'events'
import path from 'path'

const jobQueueArray = []

const eventEmitter = new events.EventEmitter()

export default {
  startQueue: () => {
    const impositionRequestCount = config.pds.count.imposition
    log.info(`启动xml-removal监控，并行数量: ${impositionRequestCount}`)
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
  let psName = path.basename(filePath)

  log.debug(`编号: ${index}，档案${psName}开始进行XML清除`)

  try {
    processor.inputRemoval(filePath)
  } catch (err) {
    if (err.message) {
      log.error(err.message)
    } else {
      log.error(err)
    }
    return
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
  log.debug(`编号: ${index} xml-removal 完成，开始新的 xml-removal 处理`)
})

function delay(s) {
  return new Promise(function (resolve, reject) {
    setTimeout(resolve, s);
  })
}