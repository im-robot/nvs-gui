'use strict'

import { app, protocol, BrowserWindow, ipcMain } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS3_DEVTOOLS } from 'electron-devtools-installer'
import { existsSync, mkdirSync, readdirSync, createWriteStream, readFileSync, copyFileSync, linkSync, symlinkSync, unlinkSync, writeFileSync, rmdirSync, statSync } from 'fs'
import https from 'https'
import crypto from 'crypto'
import Seven from 'node-7z'
import { exec } from 'child_process'
import path from 'path'
const isDevelopment = process.env.NODE_ENV !== 'production'


const sevenBinRoot = path.join(app.getPath('exe'), '..' ,'resources/app.asar.unpacked/node_modules/7zip-bin/')

var pathTo7zip = ''
var osName = ''


// 获取操作系统类型 eg. win-x64, win-x86, linux-x64, linux-x86, darwin-x64, linux-arm64, linux-armv7l
function getBinAndSystem() {
  const os = require('os')
  const osType = os.type()
  const osArch = os.arch()
  const osPlatform = os.platform()
  const osRelease = os.release()
  osName =  ''
  let dir = ''
  if (osType === 'Windows_NT') {
    osName = `win-${osArch}`
    dir = './win/'+ osArch +'/7za.exe'
  } else if (osType === 'Linux') {
    osName = `linux-${osArch}`
    dir = './linux/'+ osArch +'/7za'
  } else if (osType === 'Darwin') {
    osName = `darwin-${osArch}`
    dir = './darwin/'+ osArch +'/7za'
  }
  pathTo7zip = path.join(sevenBinRoot, dir)

  console.log(`osName: ${osName}`, `osPlatform: ${osPlatform}`, `osRelease: ${osRelease}`);
  
}
getBinAndSystem()
const nodejsPath = isDevelopment ? 'F:\\nvs\\nodejs' :  path.join(app.getPath('exe'), '..') + '\\nodejs'
const downloadPath = nodejsPath + '\\download'
const installedPath = nodejsPath + '\\installed'
const activedPath = nodejsPath + '\\actived'


const cmds = {
  win: `setx path "${activedPath}\\nodejs"`
}

// 判断执行shell命令
function execShell() {
  // 判断是否是windows系统
  if (osName.indexOf('win') > -1) {
    exec(cmds.win)
  }
}
execShell()

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

async function createWindow() {
  // 判断文件夹是否存在
  existsSync(nodejsPath) || mkdirSync(nodejsPath)
  existsSync(downloadPath) || mkdirSync(downloadPath)
  existsSync(installedPath) || mkdirSync(installedPath)
  existsSync(activedPath) || mkdirSync(activedPath)


  // Create the browser window.
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, 'assets/icons/256x256.png'),
    webPreferences: {
      
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: true,
      contextIsolation: false,
      // 允许跨域
      webSecurity: false,

    }
  })

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    createProtocol('nvs')
    // Load the index.html when not in development
    win.loadURL('nvs://./index.html')
  }
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS3_DEVTOOLS)
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString())
    }
  }
  createWindow()
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}

// 监听ipcMain事件

// get-installed-list
ipcMain.handle('get-installed-list', async (event) => {
  let result = readdirSync(installedPath)
  return result
})

// get-used-version
ipcMain.handle('get-used-version', async (event) => {
  try {
    let result = readFileSync(activedPath + '\\version.json', 'utf8') || '{}'
    let { version } = JSON.parse(result)
    return version
  } catch (error) {
    return ''
  }
})

// install-nodejs
ipcMain.handle('install-node', async (event, version) => {
  await installNodejs(version)
  await createLink(version)
  return true
})

// use-nodejs
ipcMain.handle('use-node', async (event, version) => {
  await createLink(version)
  return true
})

// remove-nodejs
ipcMain.handle('remove-node', async (event, version) => {
  let path = installedPath + '\\' + version
  await removeDir(path)
  return true
})


async function installNodejs(version) {
  let filename = `node-${version}-${osName}.7z`
  let fileDirname = `node-${version}-${osName}`
  let url = `https://cdn.npmmirror.com/binaries/node/${version}/${filename}`
  let sha256Url = `https://cdn.npmmirror.com/binaries/node/${version}/SHASUMS256.txt`
  let path = downloadPath + `/${filename}`
  // 获取文件远程的sha256
  let sha256 = await getSha256(sha256Url, filename)
  console.log(sha256);
  // 判断文件是否存在
  if (!existsSync(path) || !checkSha256(path, sha256)) {
    console.log('文件不存在')
    // 下载文件
    await downloadFile(url, path)
    return installNodejs(version)
  }
  // 文件存在，则解压文件
  // 重命名文件
  let renameResult = await extractFileRename(path, fileDirname, version)
  if (!renameResult) {
    return false
  }
  let result = await extractFile(path, installedPath)
  console.log(result);
  if (result === 'success') {
    return true
  }
  return false
}

// 压缩文件重命名
async function extractFileRename(path, oldName, newName) {
  const rn = Seven.rename(path, [
    [oldName, newName],
  ], {
    $bin: pathTo7zip
  })
  return await new Promise((resolve, reject) => {
    
    rn.on('error', (err) => {
      reject(err)
    })
    rn.on('end', () => {
      console.log('重命名完成')
      resolve('success')
    })
  })
}

// 解压文件
async function extractFile(path, extractPath) {
  const myStream = Seven.extractFull(path, extractPath, {
    $bin: pathTo7zip
  })
  return new Promise((resolve, reject) => {
    myStream.on('error', (err) => {
      reject(err)
    }).on('end', () => {
      resolve('success')
      myStream.destroy()
    }).on('progress', (progress) => {
      console.log(progress);
    })
  })
}


// 下载文件到本地
function downloadFile(url, path) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(path)
    const request = https.get(url, (response) => {
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    })
  })
}

// 获取远程sha256
function getSha256(url, filename) {
  let r = new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      let data = ''
      response.on('data', (chunk) => {
        data += chunk
      })
      response.on('end', () => {
        resolve(data)
      })
    })
  })
  return r.then(res=> {
    let map = {}
    res.split('\n').forEach(item => {
      let arr = item.split('  ')
      map[arr[1]] = arr[0]
    })
    return map[filename]
  })
}


// 检测SHASUMS256是否一致
function checkSha256(path, sha256) {
  let sha256Local = crypto.createHash('sha256').update(readFileSync(path)).digest('hex')
  console.log(sha256Local, sha256);
  return sha256Local === sha256
}


// 将指定版本的nodejs创建硬链接
function createLink(version) {
  let linkPath = activedPath
  let linkName = `nodejs`
  let link = `${linkPath}/${linkName}`
  let linkTarget = `${installedPath}/${version}`
  if (!existsSync(linkPath)) {
    mkdirSync(linkPath)
  }
  if (existsSync(link)) {
    unlinkSync(link)
  }
  symlinkSync(linkTarget, link)
  // 创建version.json文件导actived目录
  let versionJson = {
    version: version
  }
  let versionJsonPath = activedPath + '\\' + 'version.json'
  writeFileSync(versionJsonPath, JSON.stringify(versionJson))
}

// 递归删除文件夹和文件夹里的文件
function removeDir(path) {
  let files = readdirSync(path)
  files.forEach(file => {
    let curPath = path + '\\' + file
    if (statSync(curPath).isDirectory()) {
      removeDir(curPath)
    } else {
      unlinkSync(curPath)
    }
  })
  rmdirSync(path)
}

