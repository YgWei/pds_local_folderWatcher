'use strict'
import watcherUtil from '../util/watcher'
import config from '../config'
import path from 'path'
import log from './log'
import impositionJobQueue from './impositionJobQueue'
import psJobQueue from './psJobQueue'
import transformJobQueue from './transformJobQueue'
import printJobQueue from './printJobQueue'
import transformBL from '../pluggin/transformBreakList'
import clearJobQueue from './clearJobQueue'

// get custom configuration
const baseWatchConfig = config.baseWatchConfig
const inputFolder = config.folder.input
const impositionFolder = config.folder.imposition
const printFolder = config.folder.print
const impositionPsFolder = config.folder.impositionPs

// initial watcher
export default {
	startPrintWatcher: () => {
		const inputWatcher = watcherUtil.createWatcher(inputFolder, baseWatchConfig)
		inputWatcher
			.on('add', async filePath => {
				if (path.extname(filePath) === '.xml') {
					log.info(`档案 ${path.basename(filePath)} 被加入落版佇列`)
					impositionJobQueue.pushElement(filePath)
				}
			})

		const impositionWatcher = watcherUtil.createWatcher(impositionFolder, baseWatchConfig)
		impositionWatcher
			.on('add', async filePath => {
				if (transformBL.checkElement(path.basename(filePath))) {
					transformBL.removeElement(path.basename(filePath))
					clearJobQueue.pushElement(filePath)
				}
				else if (path.extname(filePath) === '.pdf') {
					log.info(`档案 ${path.basename(filePath)} 被加入转换佇列`)
					transformJobQueue.pushElement(filePath)
				}
			})
			.on('change', async filePath => {
				if (transformBL.checkElement(path.basename(filePath))) {
					transformBL.removeElement(path.basename(filePath))
					clearJobQueue.pushElement(filePath)
				}
			})

		const printWatcher = watcherUtil.createWatcher(printFolder, baseWatchConfig)
		printWatcher
			.on('add', async filePath => {
				if (path.extname(filePath) === '.xml') {
					log.info(`档案 ${path.basename(filePath)} 被加入纸槽处理佇列`)
					printJobQueue.pushElement(filePath)
				}
			})

		const psWatcher = watcherUtil.createWatcher(impositionPsFolder, baseWatchConfig)
		psWatcher
			.on('add', async filePath => {
				if (path.extname(filePath) === '.ps') {
					log.info(`档案 ${path.basename(filePath)}被新增，加入ps处理伫列`)
					psJobQueue.pushElement(filePath)
				}
			})
		psWatcher
			.on('change', async filePath => {
				if (path.extname(filePath) === '.ps') {
					log.info(`档案 ${path.basename(filePath)}被修改，加入ps处理伫列`)
					psJobQueue.pushElement(filePath)
				}
			})
	}
}