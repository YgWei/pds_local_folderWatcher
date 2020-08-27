'use strict'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config()

const env = process.env.NODE_ENV || 'development'

const baseWatchConfig = JSON.parse(fs.readFileSync('config/watch.json'))

const configs = {
  base: {
    env,
    baseWatchConfig,
    folder: {
      "backgroundPdf": "backgroundPdf",
      "pdfSource": "pdfSource",
      "input": "input",
      "inputError": "inputError",
      "inputProcessed": "inputProcessed",
      "imposition": "imposition",
      "transform": "transform",
      "print": "print",
      "printError": "printError",
      "printProcessed": "printProcessed",
      "impositionPs": "impositionPs"
    },
    pds: {
      count: {
        imposition: process.env.PDS_IMPOSITION_COUNT || 1,
        transform: process.env.PDS_TRANSFORM_COUNT || 1,
        print: process.env.PDS_PRINT_COUNT || 1
      }
    },
    breakList: {
      productName: process.env.BREAK_LIST_PRODUCT_NAME || ''
    }
  },
  production: {
  },
  development: {
  },
  test: {
  }
}
const config = Object.assign(configs.base, configs[env])

export default config

