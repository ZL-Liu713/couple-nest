import {validatePhoto} from './model.js';
// Decode and re-encode: constrain dimensions and strip camera metadata before upload.
export async function preparePhoto(file){
 validatePhoto(file);let bitmap;
 try{bitmap=await createImageBitmap(file);}catch{throw Error('无法读取这张照片，请换一张 JPG、PNG 或 WebP 图片');}
 try{const scale=Math.min(1,1800/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const context=canvas.getContext('2d');context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('图片处理失败，请重试')),'image/jpeg',.86));}finally{bitmap.close();}
}
