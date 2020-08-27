import config from '../config'
import path from 'path'
import log from './log'
import processor from './Processor'
import events from 'events'

const jobQueueArray = []

const eventEmitter = new events.EventEmitter()

export default {
  startQueue: () => {
    log.info('启动清理监控')
    eventEmitter.emit('watchJobQueue', 1)
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
  let fileName = path.basename(filePath)
  log.debug(`编号: ${index}，档案${fileName}开始进行清理`)

  try {
    await processor.clearProcessData(fileName)
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
  log.debug(`编号: ${index}落版完成，开始新的落版处理`)
})

function delay(s) {
  return new Promise(function (resolve, reject) {
    setTimeout(resolve, s);
  })
}