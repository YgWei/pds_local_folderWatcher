import config from '../config'
import transformBL from '../pluggin/transformBreakList'

const breakListName = config.breakList.productName.split(',')

'use strict'
export default {
	xmlJS2acc: xmlJS => {
		const cover = xmlJS.printinfo.type && xmlJS.printinfo.type[0] === '1' ? true : false
		const printMode = xmlJS.printinfo.printMode && xmlJS.printinfo.printMode[0] ? xmlJS.printinfo.printMode[0] : 'normal'
		const blankPDF = xmlJS.printinfo.blankPDF && xmlJS.printinfo.blankPDF[0] ? xmlJS.printinfo.blankPDF[0] : undefined
		const insertPage = xmlJS.printinfo.insertPage && xmlJS.printinfo.insertPage[0] ? xmlJS.printinfo.insertPage[0] : undefined
		const paperWeight = xmlJS.printinfo.paperWeight && xmlJS.printinfo.paperWeight[0] ? Number.parseInt(xmlJS.printinfo.paperWeight[0]) : undefined
		const printDPI = xmlJS.printinfo.printerDPI && xmlJS.printinfo.printerDPI[0] ? Number.parseInt(xmlJS.printinfo.printerDPI[0]) : undefined
		const sourceResize = xmlJS.printinfo.sourceResize && xmlJS.printinfo.sourceResize[0] ? xmlJS.printinfo.sourceResize[0] : undefined
		const pageSize = xmlJS.printinfo.pageSize && xmlJS.printinfo.pageSize[0] ? Number.parseFloat(xmlJS.printinfo.pageSize[0]) : undefined
		const sourceRotate = xmlJS.printinfo.sourceRotate && xmlJS.printinfo.sourceRotate[0] ? xmlJS.printinfo.sourceRotate[0] : undefined
		const sourceStamp = xmlJS.printinfo.sourceStamp ? [] : undefined
		const insertText = xmlJS.printinfo.insertText && xmlJS.printinfo.insertText[0] ? xmlJS.printinfo.insertText[0] : undefined
		const sourceShift = xmlJS.printinfo.sourceShift ? xmlJS.printinfo.sourceShift[0] : undefined
		const imageOptimization = xmlJS.printinfo.imageOptimization && (xmlJS.printinfo.imageOptimization[0] === 'true') ? true : false
		const colorPrint = xmlJS.printinfo.colorPrint ? xmlJS.printinfo.colorPrint[0] : undefined

		let acc = {
			insurance: xmlJS.printinfo.insurance[0],
			productName: xmlJS.printinfo.insurance[0],
			company: xmlJS.printinfo.company[0],
			renderType: xmlJS.printinfo.renderType[0],
			cover,
			printMode,
			barcode: xmlJS.printinfo.barcode[0],
			materials: [],
			blankPDF,
			insertPage: insertPage ? [] : undefined,
			paperWeight,
			printDPI,
			pageSize,
			sourceResize: sourceResize ? {
				scale: sourceResize.scale && sourceResize.scale[0] ? Number.parseFloat(sourceResize.scale[0]) : undefined,
				size: {
					width: sourceResize.size[0].width && sourceResize.size[0].width[0] ? sourceResize.size[0].width[0] : undefined,
					height: sourceResize.size[0].height && sourceResize.size[0].height[0] ? sourceResize.size[0].height[0] : undefined
				},
				resizePages: [
					...sourceResize.resizePages[0].pages
				]
			} : undefined,
			sourceRotate: sourceRotate ? [] : undefined,
			sourceStamp,
			insertText: insertText ? [] : undefined,
			sourceShift: sourceShift ? {} : undefined,
			imageOptimization,
			colorPrint: colorPrint ? {
				colorPages: colorPrint.colorPages[0].pages
			} : undefined
		}

		let materialExist = {}

		// === material ===
		let currentMaterial = ''
		xmlJS.printinfo.paperTray[0].row.forEach(element => {
			let materialName = element.name[0]
			let printMode = xmlJS.printinfo.printMode[0]
			if (materialName === 'A3C' && printMode === 'normal') {
				materialName = 'A4BW'
			}
			acc.materials.push({
				'materialName': materialName,
				'startPage': element.startPage[0],
				'endPage': element.endPage[0]
			})
			// print block. on pre-render step paperType element is not exist
			if (element.paperType !== undefined) {
				if (acc.mappings === undefined) {
					acc.mappings = []
				}
				if (element.paperType.toString() === currentMaterial) {
					const lastEndPage = acc.materials.pop().endPage
					const lastItemIndex = acc.materials.length - 1
					acc.materials[lastItemIndex].endPage = lastEndPage
					return
				} else {
					currentMaterial = element.paperType.toString()
				}
				if (!materialExist[materialName]) {
					acc.mappings.push({
						materialName: materialName,
						printerName: xmlJS.printinfo.machineType ? xmlJS.printinfo.machineType[0] : undefined,
						tray: element.paperType[0]
					})
					materialExist[materialName] = true
				}
			}
		})

		// === insert page ===
		if (insertPage) {
			insertPage.row.forEach(element => {
				const insertIndex = Number.parseInt(element.insertIndex[0])
				const insertPDF = element.insertPDF ? element.insertPDF[0] : undefined
				acc.insertPage.push({
					insertIndex,
					insertPDF
				})
			})
		}

		// === rotate ===
		if (sourceRotate) {
			sourceRotate.row.forEach(element => {
				const angle = Number.parseInt(element.angle[0])
				const accBody = {
					angle,
				}
				if (element.rotatePages) {
					accBody.rotatePages = [...element.rotatePages[0].pages]
				} else {
					accBody.horizontalPages = (element.horizontalPages[0] === 'true')
				}
				acc.sourceRotate.push(accBody)
			})
		}

		// === sourceStamp ===
		if (xmlJS.printinfo.sourceStamp) {
			xmlJS.printinfo.sourceStamp[0].row.forEach(stamp => {
				let stampPages = []
				for (let page of stamp.stampPages[0].pages) {
					stampPages.push(page)
				}
				let stampSource = stamp.stampSource[0]
				acc.sourceStamp.push({
					'stampSource': stampSource,
					'stampPages': stampPages,
				})
			})
		}

		// === insertText ===
		if (insertText) {
			insertText.row.forEach(element => {
				const accBody = {
					font: element.font[0],
					size: Number.parseInt(element.size[0]),
					positionX: Number.parseInt(element.positionX[0]),
					positionY: Number.parseInt(element.positionY[0]),
					page: Number.parseInt(element.page[0]),
					text: element.text[0]
				}
				acc.insertText.push(accBody)
			})
		}

		// === sourceShift ===
		if (sourceShift) {
			acc.sourceShift = {
				horizontal: Number.parseInt(sourceShift.horizontal[0]),
				vertical: Number.parseInt(sourceShift.vertical[0])
			}
		}

		// === breakList ===
		if (breakListName.includes(acc.productName)) {
			transformBL.addElement(xmlJS.printinfo.pdfName[0])
		}

		return JSON.stringify(acc, null, 2)
	}
}