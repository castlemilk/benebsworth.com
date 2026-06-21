function handler(event) {
  var request = event.request
  // Host canonicalisation: 301 any www.* host to its bare apex so a single
  // hostname is indexed (no www/non-www duplicate content). Domain-agnostic so
  // the same function is correct for prod and staging.
  var host = request.headers.host && request.headers.host.value
  if (host && host.indexOf('www.') === 0) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: 'https://' + host.slice(4) + request.uri } },
    }
  }
  var uri = request.uri
  if (uri.endsWith('/')) { request.uri = uri + 'index.html' }
  else if (!uri.includes('.')) { request.uri = uri + '/index.html' }
  return request
}
