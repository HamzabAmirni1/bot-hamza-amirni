const fetch = require("node-fetch");
const { FormData, Blob  } = require("formdata-node");
const { fileTypeFromBuffer  } = require("file-type")

module.exports = async buffer => {
  const { ext, mime } = await fileTypeFromBuffer(buffer)
  let form = new FormData()
  const blob = new Blob([buffer.toArrayBuffer()], { type: mime })
  form.append('file', blob, 'tmp.' + ext)
  let res = await fetch('https://cdn.tioxy.my.id/api/upload ', {
    method: 'POST',
    body: form
  })
  let img = await res.json()
  return img
}