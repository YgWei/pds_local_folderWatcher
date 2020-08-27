'use strict'
import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import config from '../config'

const directory = process.env.LOG_DIRECTORY || 'logs'
const fileName = process.env.LOG_FILENAME || 'JKLocalWatcher'
const logLevel = process.env.LOG_LEVEL || 'info'

const format = winston.format
const log = winston.createLogger({
    level: logLevel,
    format: format.combine(
        format.timestamp(),
        // if you need pretty print
        format.prettyPrint()
    ),
    transports: [
        new (DailyRotateFile)({
            filename: `${fileName}.%DATE%.log`,
            dirname: directory,
            datePattern: 'YYYY-MM-DD',
        })
    ]
})

export default log