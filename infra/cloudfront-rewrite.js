function handler(event) {
  var req = event.request
  var uri = req.uri
  if (uri.endsWith('/')) { req.uri = uri + 'index.html' }
  else if (!uri.includes('.')) { req.uri = uri + '/index.html' }
  return req
}
