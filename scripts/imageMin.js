/*
	此脚本用于压缩目录中的图片使用，使用前，请将图片目录先做备份
	使用方法：
		node imageMin.js 图片目录
	比如：
		node scripts/imageMin.js /Users/libo/截图
*/

const fs = require('fs');
const path = require('path');
const fileType = require('file-type');
const imagemin = require('imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');
const imageminGifsicle = require('imagemin-gifsicle');

// const DIRECTORY = "/Users/libo/截图";
let processedAmount = 0;
let failedAmount = 0;


async function procFiles(directory) {
    let fileNames = fs.readdirSync(directory);

    for(let filename of fileNames) {
    	let fullPath = path.join(directory, filename);

    	// console.log(`fullPath: ${fullPath}`);
    	try {
	        let stat = fs.statSync(fullPath);

	        if (stat.isDirectory()) {
	            await procFiles(fullPath);
	        } else {
		        let ext = path.parse(fullPath).ext;
		        // console.log(`ext: ${ext}`);

		        if(['.png', '.jpg', '.jpeg', '.gif'].indexOf(ext) !== -1) {
		        	let buffer = fs.readFileSync(fullPath);
		        	let originBufferSize = buffer.length;

					buffer = await imagemin.buffer(buffer, {
						plugins: [
			            	imageminMozjpeg({
			            		quality: 45
			            	}),
			            	imageminPngquant({
			            		quality: [0.3, 0.4]
			            	}),
			            	imageminGifsicle({
			            		optimizationLevel: 2,
			            		colors: 128
			            	})
			        	]
			       	});
			       	let minBufferSize = buffer.length;

			       	fs.writeFileSync(fullPath, buffer);
			       	++processedAmount;
			       	console.log(`succeed! (${processedAmount}/${failedAmount}), ${originBufferSize}->${minBufferSize}, filename: ${fullPath}`);
			    }
	        }
    	} catch (error) {
    		++failedAmount;
        	console.error(`error: ${error.message}, filename: ${fullPath}`);
        }
    }
}

async function main () {
	let DIRECTORY = process.argv[2];
	// await procFiles(DIRECTORY);
	if(DIRECTORY) {
		console.log(`需要压缩图片的目录为：${DIRECTORY}`);
		await procFiles(DIRECTORY);
	} else {
		console.log(`找不到执行参数。`);
	}
}

main().then(() => {
	console.log(`over!`);
	process.exit(0);
}).catch(error => {
	console.error(`errored: ${error.message}, stack: ${error.stack}`);
});

