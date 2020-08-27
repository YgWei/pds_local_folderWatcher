'use strict'
import axios from 'axios'

let token = ''
let tokenLock = false

export default {
    isLock: () => {
        return tokenLock
    },
    refreshToken: async () => {
        tokenLock = true
        token = await loginPDS()
        tokenLock = false
        return token
    },
    getToken: () => {
        return token
    }
}

function loginPDS() {
    let pdsPortocol = process.env.PDS_PORTOCOL
    let pdsURL = process.env.PDS_URL
    let pdsPort = process.env.PDS_PORT
    let user = process.env.PDS_USER
    let passwd = process.env.PDS_PASSWD
    let loginAPI = process.env.PDS_LOGIN_API
    let body = {
        'userName': user,
        'password': passwd
    }
    return new Promise((resolve, reject) => {
        axios.post(`${pdsPortocol}://${pdsURL}:${pdsPort}/${loginAPI}`, body)
            .then(response => {
                resolve(response.data.data.token)
            })
            .catch(err => {
                reject(err)
            })
    })
}