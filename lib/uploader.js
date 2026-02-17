let axios = require('axios')
let BodyForm = require('form-data')
let { fromBuffer } = require('file-type')
let fetch = require('node-fetch')
let fs = require('fs')
let cheerio = require('cheerio')
let path = require('path')
let crypto = require('crypto')
let { tmpdir } = require('os')
const ezgif = require('./ezgif')

/**
 * Tioxy CDN Uploader
 * @param {Buffer} buffer 
 */
async function Tioxy(buffer) {
	try {
		const { ext, mime } = await fromBuffer(buffer) || { ext: 'bin', mime: 'application/octet-stream' };
		const form = new BodyForm();
		form.append('file', buffer, {
			filename: 'tmp.' + ext,
			contentType: mime
		});
		const res = await fetch('https://cdn.tioxy.my.id/api/upload', {
			method: 'POST',
			body: form,
			headers: form.getHeaders()
		});
		const img = await res.json();
		if (img.status && img.result?.url) return img.result.url;
		return img.url || img.result?.url || img;
	} catch (e) {
		throw e;
	}
}

/**
 * Catbox Uploader (Enhanced with User Snippet logic)
 * @param {Buffer} buffer 
 */
async function Catbox(buffer) {
	try {
		const { ext, mime } = await fromBuffer(buffer) || { ext: 'jpg', mime: 'image/jpeg' };
		const formData = new BodyForm();
		const randomBytes = crypto.randomBytes(5).toString("hex");

		formData.append("reqtype", "fileupload");
		formData.append("fileToUpload", buffer, {
			filename: randomBytes + "." + ext,
			contentType: mime
		});

		const response = await fetch("https://catbox.moe/user/api.php", {
			method: "POST",
			body: formData,
			headers: {
				...formData.getHeaders(),
				"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36",
			},
		});

		return await response.text();
	} catch (e) {
		throw e;
	}
}

/**
 * Telegra.ph Uploader
 */
function TelegraPh(Path) {
	return new Promise(async (resolve, reject) => {
		if (!fs.existsSync(Path)) return reject(new Error("File not Found"))
		try {
			const form = new BodyForm();
			form.append("file", fs.createReadStream(Path))
			const data = await axios({
				url: "https://telegra.ph/upload",
				method: "POST",
				headers: {
					...form.getHeaders()
				},
				data: form
			})
			return resolve("https://telegra.ph" + data.data[0].src)
		} catch (err) {
			return reject(new Error(String(err)))
		}
	})
}

/**
 * Uguu.se Uploader
 */
async function UploadFileUgu(input) {
	return new Promise(async (resolve, reject) => {
		const form = new BodyForm();
		form.append("files[]", fs.createReadStream(input))
		await axios({
			url: "https://uguu.se/upload.php",
			method: "POST",
			headers: {
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
				...form.getHeaders()
			},
			data: form
		}).then((data) => {
			resolve(data.data.files[0])
		}).catch((err) => reject(err))
	})
}

/**
 * WebP to MP4 (Ezgif)
 */
async function webp2mp4File(filePath) {
	try {
		const result = await ezgif.convert({
			type: 'webp-mp4',
			file: fs.readFileSync(filePath),
			filename: path.basename(filePath)
		});
		return { status: true, result };
	} catch (e) {
		throw e;
	}
}

/**
 * Videy.co Uploader (Video Hosting)
 */
async function Videy(buffer) {
	try {
		const { ext, mime } = await fromBuffer(buffer) || { ext: 'mp4', mime: 'video/mp4' };
		let form = new BodyForm();
		form.append('file', buffer, {
			filename: 'tmp.' + ext,
			contentType: mime
		});
		let res = await fetch('https://videy.co/api/upload', {
			method: 'POST',
			body: form
		});
		let vid = await res.json();
		if (!vid) throw new Error('Videy Upload Failed');
		return 'https://cdn.videy.co/' + vid.id + '.mp4';
	} catch (e) {
		throw e;
	}
}

/**
 * Main Upload Function
 */
async function uploadImage(buffer) {
	try {
		// Try Tioxy first
		const res = await Tioxy(buffer);
		if (typeof res === 'string' && res.startsWith('http')) return res;

		// Fallback to Catbox
		return await Catbox(buffer);
	} catch (e) {
		try {
			// Fallback to TelegraPh
			const { ext } = await fromBuffer(buffer) || { ext: 'jpg' };
			const tempFile = path.join(tmpdir(), `upload_${Date.now()}.${ext}`);
			fs.writeFileSync(tempFile, buffer);
			const result = await TelegraPh(tempFile);
			if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
			return result;
		} catch (e2) {
			console.error('All Uploaders Failed:', e2);
			throw e2;
		}
	}
}

/**
 * File.io Uploader (One-time download, good for APIs)
 */
async function FileIO(buffer) {
	try {
		const { ext, mime } = await fromBuffer(buffer) || { ext: 'bin', mime: 'application/octet-stream' };
		const form = new BodyForm();
		form.append('file', buffer, { filename: `file.${ext}`, contentType: mime });
		const res = await fetch('https://file.io/?expires=1d', { method: 'POST', body: form });
		const json = await res.json();
		if (json.success && json.link) return json.link;
		throw new Error('FileIO Failed');
	} catch (e) { throw e; }
}

/**
 * Generic File Uploader (Catbox -> FileIO)
 */
async function uploadFile(buffer) {
	// Try Catbox first (Persistent)
	try { return await Catbox(buffer); } catch (e) { }

	// Try FileIO (Ephemeral)
	try { return await FileIO(buffer); } catch (e) { }

	// Try Tioxy
	try {
		const res = await Tioxy(buffer);
		if (typeof res === 'string' && res.startsWith('http')) return res;
	} catch (e) { }

	throw new Error('All file uploaders failed');
}

module.exports = {
	TelegraPh,
	UploadFileUgu,
	webp2mp4File,
	uploadImage,
	uploadFile,
	Catbox,
	Tioxy,
	Videy,
	FileIO,
	...ezgif
}