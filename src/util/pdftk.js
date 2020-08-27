import pdftk from 'node-pdftk'
import config from '../config'
import fs from 'fs-extra'
import log from '../services/log'

const backgroundFolder = config.folder.backgroundPdf
const pdfFolder = config.folder.pdfSource

const pdfMapping = (pageIndex, concatArray, letterCode) => {
  // Mapping the Concatenate pages
  let pageIndexValue

  for (let i = 0; i < pageIndex.length; i++) {
    pageIndexValue = pageIndex[i].split('-')
    if (pageIndexValue.length !== 1) {
      const startPage = parseInt(pageIndexValue[0])
      const endPage = parseInt(pageIndexValue[1])
      for (let page = startPage; page <= endPage; page++) {
        concatArray[page - 1] = letterCode
      }
    } else {
      concatArray[pageIndexValue[0] - 1] = letterCode
    }
  }

  return concatArray
}

function nextChar(c) {
  return String.fromCharCode(c.charCodeAt(0) + 1);
}

async function pdfStamp(pdfFileName, backgroundPdfSources, catArray) {
  const blankPdf = `${backgroundFolder}/blank.pdf`
  const pdf = `${pdfFolder}/${pdfFileName}`

  const inputObject = {
    Z: blankPdf,
  }

  let letter = 'A'
  for (let backgroundFileName of backgroundPdfSources) {
    inputObject[letter] = `${backgroundFolder}/${backgroundFileName}`
    letter = nextChar(letter)
  }

  const catString = catArray.join(' ')
  try {
    await pdftk.input(inputObject)
      .cat(catString)
      .output(`${pdfFolder}/back.pdf`)
    log.info('Succeed on creating a Concatenate pages')
  } catch (err) {
    if (typeof err === 'string') {
      throw new Error(err)
    }
    throw err
  }

  try {
    await pdftk.input(pdf)
      .multiStamp(`${pdfFolder}/back.pdf`)
      .output(`${pdfFolder}/${pdfFileName}`)
    log.info('Succeed on creating a stamp pages')
  } catch (err) {
    if (typeof err === 'string') {
      throw new Error(err)
    }
    throw err
  } finally {
    log.info(`removing back.pdf in ${pdfFolder}`)
    try {
      fs.unlinkSync(`${pdfFolder}/back.pdf`)
    } catch {
      log.error(`Fail on removing back.pdf in ${pdfFolder}`)
    }
  }
}

export default {
  startStamp: async (xmlData) => {
    log.info('Start stamp pdf process...')
    const sourceStamp = xmlData.printinfo.sourceStamp[0].row
    const pdfFileName = xmlData.printinfo.pdfName[0]
    const paperTray = xmlData.printinfo.paperTray[0].row
    const totalPage = paperTray[paperTray.length - 1].endPage[0]
    const concatenatePages = []

    // fill all Concatenate pages with blank pages
    for (let startPageIndex = 0; startPageIndex < totalPage; startPageIndex++) {
      concatenatePages.push(`Z`)
    }

    let letter = 'A'
    const backgroundPdfSources = []
    for (let stamp of sourceStamp) {
      let pages = []
      for (let pageNumber of stamp.stampPages[0].pages) {
        pages.push(pageNumber)
      }
      if (!fs.existsSync(`${backgroundFolder}/${stamp.stampSource[0]}`)) {
        throw new Error(`Background pdf file ${backgroundFolder}/${stamp.stampSource[0]} is not exist`)
      }
      backgroundPdfSources.push(stamp.stampSource[0])

      pdfMapping(pages, concatenatePages, letter)
      letter = nextChar(letter)
    }

    await pdfStamp(pdfFileName, backgroundPdfSources, concatenatePages)
  }
} 
