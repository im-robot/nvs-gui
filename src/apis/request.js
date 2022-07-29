// 封装fetch

function request(url, options) {
  return fetch(url, options).then(response => response.json());
}


function get(url, data) {
    if (data) {
        url += '?' + querystring.stringify(data);
    }
    return request(url, {
        method: 'GET'
    });
}

function post(url, data) {
    return request(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
}

module.exports = {
    get,
    post
};