const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  runtimeCompiler: true,
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: true,
      customFileProtocol: 'nvs://./',
      mainProcessFile: 'src/background.js',
      rendererProcessFile: 'src/main.js',
      externals: ['7zip-bin'],
      builderOptions: {
        "productName": "nvs-gui",
        "appId": "com.lidede.nvs-gui",
        "copyright": "Copyright © 2022 Lidede",
        win: {
          target: [{
            target: 'nsis',
            arch: ['x64']
          }],
          "icon": "build/icons/icon.ico",
          "legalTrademarks": "Copyright © 2022 Lidede",
          requestedExecutionLevel: "requireAdministrator"
        },
        "nsis": {
          "oneClick": false,
          "perMachine": true,
          allowElevation: true,
          allowToChangeInstallationDirectory: true,
          installerIcon: "build/icons/icon.ico",
          uninstallerIcon: "build/icons/icon.ico",
          installerHeaderIcon: "build/icons/icon.ico",
          uninstallDisplayName: "nvs-gui",
          runAfterFinish: false,
          createDesktopShortcut: true,
          createStartMenuShortcut: true,
          shortcutName: "nvs-gui",
          menuCategory: true
        }
      }
    }
  }
})
