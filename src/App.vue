<script setup>
import { Search } from '@element-plus/icons-vue'
import { ref, watch, reactive } from 'vue';
import { getNodejsVersionList } from '@/apis'
import { computed } from '@vue/reactivity';
const { ipcRenderer } = window.require('electron')


const search = ref('')
const selectValue = ref('all')
const usedVersion = ref('')
const versionList = ref([])
const installedList = ref([])
const ltsList = ref([])
const otherList = ref([])
const checkedItem = reactive({
  date: "",
  files: [],
  lts: false,
  modules: "",
  npm: "",
  openssl: "",
  security: false,
  installed: false,
  uv: "",
  v8: "",
  version: "",
  zlib: "",
  isUsed: false,
})
getNodejsVersionList().then(async res => {
  versionList.value = res
  await getUsedVersion()
  getInstalledList()
})

// 获取正在使用的版本
async function getUsedVersion() {
  usedVersion.value = await ipcRenderer.invoke('get-used-version')
  console.log(usedVersion.value);
  return true
}


// 获取已安装的版本
async function getInstalledList() {
  installedList.value = []
  otherList.value = []
  let res = await ipcRenderer.invoke('get-installed-list')
  // 从versionList中找出installedList和otherList
  console.log(res);
  versionList.value.forEach(item => {
    item.installed = res.includes(item.version)
    item.isUsed = item.version === usedVersion.value

    if (item.lts) {
      ltsList.value.push(item)
    }
    if (item.installed) {
      installedList.value.push(item)
    } else {
      otherList.value.push(item)
    }
  })
}

const renderList = computed(() => {
  console.log(versionList.value);
  if (search.value) {
    return versionList.value.filter(item => item.version.includes(search.value))
  }
  if (selectValue.value === 'all') {
    return versionList.value
  } else if (selectValue.value === 'installed') {
    return installedList.value
  } else if (selectValue.value === 'lts') {
    return ltsList.value
  } else if (selectValue.value === 'other') {
    return otherList.value
  }
})



// 点击显示详情
function showDetail(item) {
  checkedItem.version = item.version
  checkedItem.date = item.date
  checkedItem.files = item.files
  checkedItem.lts = item.lts
  checkedItem.modules = item.modules
  checkedItem.npm = item.npm
  checkedItem.openssl = item.openssl
  checkedItem.security = item.security
  checkedItem.uv = item.uv
  checkedItem.v8 = item.v8
  checkedItem.zlib = item.zlib
  checkedItem.installed = item.installed
  checkedItem.isUsed = item.version === usedVersion.value
}

async function install() {
  let res = await ipcRenderer.invoke('install-node', checkedItem.version)
  if (res) {
    await getUsedVersion()
    getInstalledList().then(() => {
      showDetail(versionList.value.find(item => item.version === checkedItem.version))
    })
  }
}

async function useNodejsVersion() {
  let res = await ipcRenderer.invoke('use-node', checkedItem.version)
  if (res) {
    await getUsedVersion()
    getInstalledList().then(() => {
      showDetail(versionList.value.find(item => item.version === checkedItem.version))
    })
  }
}
function selectChangeHandler() {

}

async function removeNodejsVersion() {
  ipcRenderer.invoke('remove-node', checkedItem.version)
  await getUsedVersion()
  getInstalledList().then(() => {
    showDetail(versionList.value.find(item => item.version === checkedItem.version))
  })
}

</script>

<template>
<div id="app">
  <!-- 左右布局 -->
  <el-container class="app">
    <el-aside width="201px" class="sidebar">
      <!-- 搜索框 -->
      <div class="search-container">
        <el-input
          v-model="search"
          placeholder="搜索"
          :prefix-icon="Search"
        ></el-input>
      </div>
      <!-- 选择框 -->
      <div class="search-container">
        <el-select v-model="selectValue" placeholder="Select" @change="selectChangeHandler">
          <el-option label="所有版本" value="all" />
          <el-option label="已安装" value="installed" />
          <el-option label="只显示lts" value="lts" />
          <el-option label="未安装" value="other" />
        </el-select>
      </div>
      <!-- 版本列表 1. 已安装版本列表 2. 其他版本列表 -->

      <div class="version-list-container">
        <template v-for="(item, index) in renderList" :key="index">
          <div class="version-item" :class="{active: checkedItem.version === item.version, used: usedVersion === item.version }" @click="showDetail(item)">
            <div class="version-v">{{item.version}}</div>
            <div class="version-lts"><span v-if="item.lts">lts</span></div>
            <div class="version-installed"><span v-if="item.installed">installed</span></div>
          </div>
        </template>

      </div>

    </el-aside>
    <el-main>
      <el-descriptions
        :title="checkedItem.version"
        :column="2"
        size="small"
        border
        v-if="checkedItem.version.length > 0"
      >
        <template #extra>
          <template v-if="checkedItem.installed">
            <el-button type="danger" size="small" v-show="!checkedItem.isUsed" @click="removeNodejsVersion">卸载</el-button>
            <el-button type="success" size="small" v-show="!checkedItem.isUsed" @click="useNodejsVersion">启用</el-button>
          </template>
          <el-button type="primary" size="small"  v-else @click="install">安装</el-button>
        </template>
        <el-descriptions-item label="发布日期">{{checkedItem.date}}</el-descriptions-item>
        <el-descriptions-item label="稳定版">
          <el-tag size="small" v-if="checkedItem.lts">是</el-tag>
          <el-tag size="small" type="danger" v-else>否</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="npm版本">
          <el-tag size="small" type="info">{{checkedItem.npm}}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="v8版本">
          <el-tag size="small" type="info">{{checkedItem.v8}}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="zlib版本">
          <el-tag size="small" type="info">{{checkedItem.zlib}}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="openssl版本">
          <el-tag size="small" type="info">{{checkedItem.openssl}}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="npm版本">
          <el-tag size="small" type="info">{{checkedItem.npm}}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="npm版本">
          <el-tag size="small" type="info">{{checkedItem.npm}}</el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </el-main>
  </el-container>
</div>
</template>

<style lang="scss" scoped>
.app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  border-right: 1px solid #e6e6e6;
  display: flex;
  flex-direction: column;
}

.search-container {
  padding: 10px;
  border-bottom: 1px solid #e6e6e6;
}
.version-list-container {
  flex: 1;
  overflow-y: auto;
}
.version-item {
  padding: 5px 10px;
  border-bottom: 1px solid #e6e6e6;
  user-select: none;
  cursor: pointer;
  line-height: 24px;
  font-size: 14px;
  display: flex;
  transition: all .13s;
  border-left: 4px solid transparent;
  &.used {
    // 蓝色
    border-left: 4px solid #1890ff;
  }
  &:hover, &.active {
    background-color: #efefef;
    color: #000;
    box-shadow: 0 0 3px #a3a3a3;
  }
  .version-v {
    flex: 1;
  }
  .version-lts {
    width: 30px;
    color: #ff9900;
    text-align: center;
  }
  .version-installed {
    width: 60px;
    color: green;
    text-align: right;
  }
}
</style>
