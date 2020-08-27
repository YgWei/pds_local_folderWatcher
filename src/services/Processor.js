import config from '../config'
import fs from 'fs'
import path from 'path'
import log from './log'
import axios from 'axios'
import transformer from '../util/transformer'
import fileUtil from '../util/file'
import tokenUtil from '../util/token'
import pdftk from '../util/pdftk'

const pdf2inputMap = {} // for transform api get input files' name
const ps2inputMap = {}

const inputFolder = config.folder.input
const inputProcessedFolder = config.folder.inputProcessed
const inputErrorFolder = config.folder.inputError
const printProcessedFolder = config.folder.printProcessed
const printErrorFolder = config.folder.printError
const pdfSourceFolder = config.folder.pdfSource
const tokenRefreshWaitTime = 5000

export default {
    imposition: async (filePath, accData) => {
        let xmlName = path.basename(filePath)
        let originalFolder = path.dirname(filePath)
        log.debug(`落版参数: ${filePath} ${accData}`)

        let pdfName
        try {
            pdfName = accData.printinfo.pdfName[0]
            if (!fs.existsSync(`${pdfSourceFolder}/${pdfName}`)) {
                throw new Error(`${xmlName} pdf缺失`)
            }
        } catch (err) {
            moveFileToErrorDir(xmlName, originalFolder, inputErrorFolder)
            throw new Error(`${xmlName} pdf缺失`)
        }
        try {
            // using pdftk
            if (accData.printinfo.sourceStamp) {
                await pdftk.startStamp(accData)
            }
        } catch (err) {
            moveFileToErrorDir(xmlName, originalFolder, inputErrorFolder)
            throw new Error(`Fail on stamping pdf using pdftk: ${err.message}`)
        }
        log.debug(`落版PDF名称: ${pdfName}`)

        let newAccData
        try {
            newAccData = transformer.xmlJS2acc(accData)
        } catch (err) {
            moveFileToErrorDir(xmlName, originalFolder, inputErrorFolder)
            // moveFileToErrorDir(pdfName, pdfSourceFolder, inputErrorFolder)
            throw new Error(`${xmlName}栏位缺失`)
        }
        log.debug(`落版用acc生成完成`)

        const newAccName = `${path.basename(accData.printinfo.pdfName[0], path.extname(accData.printinfo.pdfName[0]))}.acc`
        try {
            // write new acc data
            fs.writeFileSync(`${originalFolder}/${newAccName}`, newAccData)
        } catch (err) {
            moveFileToErrorDir(xmlName, originalFolder, inputErrorFolder)
            // moveFileToErrorDir(pdfName, pdfSourceFolder, inputErrorFolder)
            throw new Error(`新伴随文件转换写入${err}`)
        }
        log.debug(`落版新acc文件写入成功: ${originalFolder}/${newAccName}`)

        // move file to processed directory
        try {
            copyFileToProcessedDir(xmlName, originalFolder, inputProcessedFolder)
            copyFileToProcessedDir(pdfName, pdfSourceFolder, inputProcessedFolder)
            moveFileToProcessedDir(newAccName, originalFolder, inputProcessedFolder)
        } catch (err) {
            removeFile(xmlName, inputProcessedFolder)
            removeFile(pdfName, inputProcessedFolder)
            removeFile(newAccName, inputProcessedFolder)
            moveFileToErrorDir(newAccName, originalFolder, inputErrorFolder)
            moveFileToErrorDir(xmlName, originalFolder, inputErrorFolder)
            throw new Error(`移动至已处理目录失败。${err}`)
        }
        log.debug(`落版文件被移动至归档目录: ${inputProcessedFolder}`)

        let token = tokenUtil.getToken()
        // send post
        const company = accData.printinfo.company[0]
        let body = {
            'pdfName': pdfName,
            'accName': newAccName,
            company
        }
        while (true) {
            try {
                await sendImpositionPost2PDS(body, token)
                log.info(`预渲染请求：${JSON.stringify(body)} 发送成功`)
                break
            } catch (err) {
                if (err === 401) {
                    if (!tokenUtil.isLock()) {
                        try {
                            token = await tokenUtil.refreshToken()
                        } catch (err) {
                            removeFile(xmlName, inputProcessedFolder)
                            removeFile(pdfName, inputProcessedFolder)
                            moveFileToErrorDir(xmlName, originalFolder, inputErrorFolder)
                            moveFileToErrorDir(newAccName, inputProcessedFolder, inputErrorFolder)
                            throw new Error(`登入失敗。${err}`)
                        }
                    } else {
                        await delay(tokenRefreshWaitTime)
                        token = tokenUtil.getToken()
                    }
                    continue
                }

                removeFile(pdfName, inputProcessedFolder)
                removeFile(xmlName, inputProcessedFolder)
                moveFileToErrorDir(newAccName, inputProcessedFolder, inputErrorFolder)
                moveFileToErrorDir(xmlName, originalFolder, inputErrorFolder)
                throw new Error(`预渲染请求：${JSON.stringify(body)} 发送失败。${err}`)
            }
        }
        const barcode = accData.printinfo.barcode[0]
        const pdfNameIndex = `${path.basename(pdfName, path.extname(pdfName))}.pdf` // 處理該死的.PDF
        pdf2inputMap[pdfNameIndex] = { xml: xmlName, pdf: pdfName, acc: newAccName, ps: barcode }
        ps2inputMap[barcode] = { xml: xmlName, pdf: pdfName }

        log.debug(`落版请求发送完成`)
    },
    transform: async (filePath) => {
        const pdfName = path.basename(filePath)
        const accName = `${path.basename(filePath, '.pdf')}.acc`
        log.debug(`PDF2PS参数: ${filePath}`)
        log.debug(`转换PDF名称: ${pdfName}`)

        if (pdf2inputMap[pdfName] === undefined) {
            throw new Error(`转换请求失败。无法找到落版参数`)
        }

        const accDataString = fs.readFileSync(`${inputProcessedFolder}/${accName}`)
        const accData = JSON.parse(accDataString)
        const company = accData.company
        let token = tokenUtil.getToken()
        // send post
        let body = {
            'pdfName': pdfName,
            'accName': accName,
            company
        }
        while (true) {
            try {
                await sendTransformPost2PDS(body, token)
                log.info(`转换请求：${JSON.stringify(body)} 发送成功`)
                break
            } catch (err) {
                if (err === 401) {
                    if (!tokenUtil.isLock()) {
                        try {
                            token = await tokenUtil.refreshToken()
                        } catch (err) {
                            const input = pdf2inputMap[pdfName]
                            const inputXmlName = input.xml
                            const inputPdfName = input.pdf
                            const inputAccName = input.acc
                            const inputPsName = input.ps
                            delete pdf2inputMap[pdfName]
                            removeFile(inputPdfName, inputProcessedFolder)
                            removeFile(inputXmlName, inputProcessedFolder)
                            // fileUtil.removeFile(`${pdfSourceFolder}/${inputPdfName}`)
                            moveFileToErrorDir(inputAccName, inputProcessedFolder, inputErrorFolder)
                            moveFileToErrorDir(inputXmlName, inputFolder, inputErrorFolder)
                            delete ps2inputMap[inputPsName]
                            throw new Error(`登入失敗。${err}`)
                        }
                    } else {
                        await delay(tokenRefreshWaitTime)
                        token = tokenUtil.getToken()
                    }
                    continue
                }
                const input = pdf2inputMap[pdfName]
                const inputXmlName = input.xml
                const inputPdfName = input.pdf
                const inputAccName = input.acc
                const inputPsName = input.ps
                delete pdf2inputMap[pdfName]
                removeFile(inputXmlName, inputProcessedFolder)
                removeFile(inputPdfName, inputProcessedFolder)
                moveFileToErrorDir(inputAccName, inputProcessedFolder, inputErrorFolder)
                // removeFile(`${pdfSourceFolder}/${inputPdfName}`)
                moveFileToErrorDir(inputXmlName, inputFolder, inputErrorFolder)

                delete ps2inputMap[inputPsName]
                throw new Error(`转换请求：${JSON.stringify(body)} 发送失败。${err}`)
            }
        }
        delete pdf2inputMap[pdfName]
        log.debug(`转换请求发送完成`)
    },
    print: async (filePath, accData) => {
        let xmlName = path.basename(filePath)
        let originalFolder = path.dirname(filePath)
        log.debug(`打印参数: ${filePath} ${accData}`)

        let pdfName
        try {
            pdfName = accData.printinfo.pdfName[0]
        } catch (err) {
            moveFileToErrorDir(xmlName, originalFolder, printErrorFolder)
            throw new Error(`${xmlName} pdf参数缺失`)
        }
        log.debug(`打印PDF名称: ${pdfName}`)

        let newAccData
        try {
            newAccData = transformer.xmlJS2acc(accData)
        } catch (err) {
            moveFileToErrorDir(xmlName, originalFolder, printErrorFolder)
            throw new Error(`${xmlName}栏位缺失`)
        }
        log.debug(`打印用acc生成完成`)

        let newAccName
        try {
            // write new acc data
            newAccName = `${path.basename(filePath, '.xml')}.acc`
            fs.writeFileSync(`${originalFolder}/${newAccName}`, newAccData)
        } catch (err) {
            moveFileToErrorDir(xmlName, originalFolder, printErrorFolder)
            throw new Error(`新伴随文件转换写入${err}`)
        }
        log.debug(`打印新acc文件写入成功: ${originalFolder}/${newAccName}`)

        // move file to processed directory
        try {
            moveFileToProcessedDir(xmlName, originalFolder, printProcessedFolder)
            moveFileToProcessedDir(newAccName, originalFolder, printProcessedFolder)
        } catch (err) {
            throw new Error(`移动至已处理目录失败。${err}`)
        }
        log.debug(`打印文件被移动至归档目录: ${printProcessedFolder}`)

        // send post
        // generate
        const company = accData.printinfo.company[0]
        let body = {
            'pdfName': pdfName,
            'accName': newAccName,
            company
        }
        let token = tokenUtil.getToken()
        while (true) {
            try {
                await sendPrintPost2PDS(body, token)
                log.info(`打印请求：${JSON.stringify(body)} 发送成功`)
                break
            } catch (err) {
                if (err === 401) {
                    if (!tokenUtil.isLock()) {
                        try {
                            token = await tokenUtil.refreshToken()
                        } catch (err) {
                            moveFileToErrorDir(xmlName, printProcessedFolder, printErrorFolder)
                            moveFileToErrorDir(newAccName, printProcessedFolder, printErrorFolder)
                            throw new Error(`登入失敗。${err}`)
                        }
                    } else {
                        await delay(tokenRefreshWaitTime)
                        token = tokenUtil.getToken()
                    }
                    continue
                }
                moveFileToErrorDir(xmlName, printProcessedFolder, printErrorFolder)
                moveFileToErrorDir(newAccName, printProcessedFolder, printErrorFolder)
                throw new Error(`打印请求：${JSON.stringify(body)} 发送失败。${err}`)
            }
        }
        log.debug(`打印请求发送完成`)
    },
    inputRemoval: (filePath) => {
        const psName = path.basename(filePath, '.ps')

        if (ps2inputMap[psName] === undefined) {
            if (!fs.existsSync(`${inputFolder}/${inputXmlName}`)) {
                return
            }
            throw new Error('Fail to remove xml file, can\'t find the ps variable')
        }

        log.debug(`PS名称: ${psName}`)

        const input = ps2inputMap[psName]
        const inputXmlName = input.xml
        const inputPdfName = input.pdf

        removeFile(inputXmlName, inputFolder)
        log.info(`移除 ${inputFolder}/${inputXmlName} 成功`)
        removeFile(inputPdfName, inputProcessedFolder)
        log.info(`移除 ${inputProcessedFolder}/${inputPdfName} 成功`)
        // removeFile(`${pdfSourceFolder}/${inputPdfName}`)

        delete ps2inputMap[psName]
    },
    clearProcessData: (pdfName) => {
        if (pdf2inputMap[pdfName]) {
            const barcode = pdf2inputMap[pdfName].ps
            delete ps2inputMap[barcode]
            const xmlFilename = pdf2inputMap[pdfName].xml
            removeFile(xmlFilename, inputFolder)
            const pdfFilename = pdf2inputMap[pdfName].pdf
            removeFile(pdfFilename, inputProcessedFolder)
            delete pdf2inputMap[pdfName]
        }
    }
}

function copyFileToProcessedDir(fileName, originalDir, ProcessedDir) {
    fileUtil.copyFile(`${originalDir}/${fileName}`, `${ProcessedDir}/${fileName}`)
}

function moveFileToProcessedDir(fileName, originalDir, ProcessedDir) {
    fileUtil.moveFile(`${originalDir}/${fileName}`, `${ProcessedDir}/${fileName}`)
}

function moveFileToErrorDir(fileName, originalDir, ProcessedDir) {
    try {
        fileUtil.moveFile(`${originalDir}/${fileName}`, `${ProcessedDir}/${fileName}`)
    } catch (err) {
        log.warn(`移动档案 ${fileName} 從 ${originalDir} 至错误归档目录 ${ProcessedDir} 失败。`)
        log.warn(err)
    }
}

function removeFile(fileName, dir) {
    fileUtil.removeFile(`${dir}/${fileName}`)
}

function sendImpositionPost2PDS(body, token) {
    let pdsPortocol = process.env.PDS_PORTOCOL
    let pdsURL = process.env.PDS_URL
    let pdsPort = process.env.PDS_PORT
    let pdsAPI = process.env.PDS_IMPOSITION_API
    return new Promise((resolve, reject) => {
        axios.post(`${pdsPortocol}://${pdsURL}:${pdsPort}/${pdsAPI}`, body, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }).then(response => {
            resolve(response)
        }).catch(err => {
            if (err.response === undefined) {
                reject(err)
            } else if (err.response.status === 401) {
                reject(err.response.status)
            }
            reject(err)
        })
    })
}

function sendTransformPost2PDS(body, token) {
    let pdsPortocol = process.env.PDS_PORTOCOL
    let pdsURL = process.env.PDS_URL
    let pdsPort = process.env.PDS_PORT
    let pdsAPI = process.env.PDS_TRANSFORM_API
    return new Promise((resolve, reject) => {
        axios.post(`${pdsPortocol}://${pdsURL}:${pdsPort}/${pdsAPI}`, body, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }).then(response => {
            resolve(response)
        }).catch(err => {
            if (err.response === undefined) {
                reject(err)
            } else if (err.response.status === 401) {
                reject(err.response.status)
            }
            reject(err)
        })
    })
}

function sendPrintPost2PDS(body, token) {
    let pdsPortocol = process.env.PDS_PORTOCOL
    let pdsURL = process.env.PDS_URL
    let pdsPort = process.env.PDS_PORT
    let pdsAPI = process.env.PDS_PRINT_API
    return new Promise((resolve, reject) => {
        axios.post(`${pdsPortocol}://${pdsURL}:${pdsPort}/${pdsAPI}`, body, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }).then(response => {
            resolve(response)
        }).catch(err => {
            if (err.response === undefined) {
                reject(err)
            } else if (err.response.status === 401) {
                reject(err.response.status)
            }
            reject(err)
        })
    })
}

function delay(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms)
    })
}