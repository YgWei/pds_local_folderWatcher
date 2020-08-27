'use strict'
import fileWatcher from './services/fileWatcher'
import impositionJobQueue from './services/impositionJobQueue'
import transformJobQueue from './services/transformJobQueue'
import printJobQueue from './services/printJobQueue'
import psJobQueue from './services/psJobQueue'
import clearJobQueue from './services/clearJobQueue'
import { clearImpositionDir } from './inspector'
import log from './services/log'

clearImpositionDir()
fileWatcher.startPrintWatcher()
impositionJobQueue.startQueue()
transformJobQueue.startQueue()
printJobQueue.startQueue()
psJobQueue.startQueue()
clearJobQueue.startQueue()

process.on('uncaughtException', function (err) {
  log.error(`未处理的异常: ${err} ${err.stack}`);
})
