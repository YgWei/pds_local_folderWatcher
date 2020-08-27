import fs from 'fs'

export default {
    copyFile: (oldPath, newPath) => {
        fs.copyFileSync(oldPath, newPath)
    },
    moveFile: (oldPath, newPath) => {
        fs.copyFileSync(oldPath, newPath)
        fs.unlinkSync(oldPath)
    },
    removeFile: (filePath) => {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
        }
    }
}