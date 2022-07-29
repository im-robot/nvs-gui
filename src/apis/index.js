// 获取nodejs版本list

import { get } from "./request";

export function getNodejsVersionList() {
    var url = 'https://cdn.npmmirror.com/binaries/node/index.json'
    return get(url)
}
