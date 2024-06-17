export default {
	url: 'https://directory.churchofjesuschrist.org/api/maps-proxy/v2/locations/',
	method: 'GET',
	headers: {
		'Accept': 'application/json',
		'X-Forwarded-Prefix': '/api/maps-proxy',
		'X-Maps-Client': 'directory',
		'X-Maps-Version': '2.2.4',
		'X-Trace': '82f120cca6814432-4',
	}
}
