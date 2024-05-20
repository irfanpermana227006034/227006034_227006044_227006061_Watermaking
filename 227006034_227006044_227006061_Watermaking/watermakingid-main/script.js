document.getElementById('addWatermark').addEventListener('click', function() {
  const imageInput = document.getElementById('imageInput').files[0];
  const watermarkImageInput = document.getElementById('watermarkImageInput').files[0];

  if (imageInput && watermarkImageInput) {
      const img = new Image();
      const watermarkImg = new Image();

      const canvas = document.getElementById('watermarkedCanvas');
      const ctx = canvas.getContext('2d');

      img.onload = function() {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          watermarkImg.onload = function() {
              // Ensure watermark fits within the image
              const scaleFactor = Math.min(canvas.width / watermarkImg.width, canvas.height / watermarkImg.height);
              const watermarkWidth = watermarkImg.width * scaleFactor;
              const watermarkHeight = watermarkImg.height * scaleFactor;
              
              // Applying DCT watermarking technique
              applyDCTWatermark(ctx, watermarkImg, watermarkWidth, watermarkHeight);

              document.getElementById('downloadButton').disabled = false;
          }
          watermarkImg.src = URL.createObjectURL(watermarkImageInput);
      }
      img.src = URL.createObjectURL(imageInput);
  }
});

document.getElementById('downloadButton').addEventListener('click', function() {
  const canvas = document.getElementById('watermarkedCanvas');
  const link = document.createElement('a');
  link.download = 'watermarked_image.png';
  link.href = canvas.toDataURL();
  link.click();
});

document.getElementById('extractWatermark').addEventListener('click', function() {
  const imageInput = document.getElementById('imageInput').files[0];

  if (imageInput) {
      const img = new Image();
      const canvas = document.getElementById('watermarkedCanvas');
      const ctx = canvas.getContext('2d');

      img.onload = function() {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          // Extracting watermark using DCT technique
          const extractedWatermark = extractDCTWatermark(ctx, canvas.width, canvas.height);

          // Display extracted watermark
          const extractedCanvas = document.createElement('canvas');
          extractedCanvas.width = extractedWatermark.width;
          extractedCanvas.height = extractedWatermark.height;
          const extractedCtx = extractedCanvas.getContext('2d');
          extractedCtx.putImageData(extractedWatermark, 0, 0);
          document.body.appendChild(extractedCanvas);
      }
      img.src = URL.createObjectURL(imageInput);
  }
});

function applyDCTWatermark(ctx, watermarkImg, width, height) {
  const canvas = ctx.canvas;
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const watermarkCanvas = document.createElement('canvas');
  const watermarkCtx = watermarkCanvas.getContext('2d');
  watermarkCanvas.width = width;
  watermarkCanvas.height = height;

  watermarkCtx.drawImage(watermarkImg, 0, 0, width, height);
  const watermarkData = watermarkCtx.getImageData(0, 0, width, height);

  const blockSize = 8;

  // Apply DCT on each block of the image and watermark
  for (let y = 0; y < canvas.height; y += blockSize) {
      for (let x = 0; x < canvas.width; x += blockSize) {
          const imgBlock = getBlock(imgData, x, y, blockSize, canvas.width);
          const watermarkBlock = getBlock(watermarkData, x, y, blockSize, width);

          const dctImgBlock = dct2D(imgBlock);
          const dctWatermarkBlock = dct2D(watermarkBlock);

          // Embed the watermark by modifying the DCT coefficients
          const alpha = 0.1; // Adjust alpha to control the visibility of the watermark
          for (let i = 0; i < blockSize; i++) {
              for (let j = 0; j < blockSize; j++) {
                  dctImgBlock[i][j] += alpha * dctWatermarkBlock[i][j];
              }
          }

          const newImgBlock = idct2D(dctImgBlock);
          setBlock(imgData, newImgBlock, x, y, canvas.width);
      }
  }

  ctx.putImageData(imgData, 0, 0);
}

function extractDCTWatermark(ctx, width, height) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const watermarkData = ctx.createImageData(width, height);

  const blockSize = 8;

  // Extract watermark from each block of the image
  for (let y = 0; y < height; y += blockSize) {
      for (let x = 0; x < width; x += blockSize) {
          const imgBlock = getBlock(imgData, x, y, blockSize, width);

          const dctImgBlock = dct2D(imgBlock);

          // Extract the watermark by analyzing the DCT coefficients
          const alpha = 0.1; // Use the same alpha as in embedding
          for (let i = 0; i < blockSize; i++) {
              for (let j = 0; j < blockSize; j++) {
                  dctImgBlock[i][j] = dctImgBlock[i][j] / alpha;
              }
          }

          const watermarkBlock = idct2D(dctImgBlock);
          setBlock(watermarkData, watermarkBlock, x, y, width);
      }
  }

  return watermarkData;
}

function getBlock(imgData, x, y, blockSize, imgWidth) {
  const block = [];
  for (let i = 0; i < blockSize; i++) {
      block[i] = [];
      for (let j = 0; j < blockSize; j++) {
          const index = ((y + i) * imgWidth + (x + j)) * 4;
          block[i][j] = imgData.data[index];
      }
  }
  return block;
}

function setBlock(imgData, block, x, y, imgWidth) {
  const blockSize = block.length;
  for (let i = 0; i < blockSize; i++) {
      for (let j = 0; j < blockSize; j++) {
          const index = ((y + i) * imgWidth + (x + j)) * 4;
          imgData.data[index] = block[i][j];
          imgData.data[index + 1] = block[i][j];
          imgData.data[index + 2] = block[i][j];
      }
  }
}

function dct2D(matrix) {
  const N = matrix.length;
  const transform = [];

  for (let u = 0; u < N; u++) {
      transform[u] = [];
      for (let v = 0; v < N; v++) {
          let sum = 0;
          for (let i = 0; i < N; i++) {
              for (let j = 0; j < N; j++) {
                  sum += matrix[i][j] *
                         Math.cos(((2 * i + 1) * u * Math.PI) / (2 * N)) *
                         Math.cos(((2 * j + 1) * v * Math.PI) / (2 * N));
              }
          }
          let cu = u === 0 ? 1 / Math.sqrt(2) : 1;
          let cv = v === 0 ? 1 / Math.sqrt(2) : 1;
          transform[u][v] = 0.25 * cu * cv * sum;
      }
  }

  return transform;
}

function idct2D(matrix) {
  const N = matrix.length;
  const inverse = [];

  for (let i = 0; i < N; i++) {
      inverse[i] = [];
      for (let j = 0; j < N; j++) {
          let sum = 0;
          for (let u = 0; u < N; u++) {
              for (let v = 0; v < N; v++) {
                  let cu = u === 0 ? 1 / Math.sqrt(2) : 1;
                  let cv = v === 0 ? 1 / Math.sqrt(2) : 1;
                  sum += cu * cv * matrix[u][v] *
                         Math.cos(((2 * i + 1) * u * Math.PI) / (2 * N)) *
                         Math.cos(((2 * j + 1) * v * Math.PI) / (2 * N));
              }
          }
          inverse[i][j] = 0.25 * sum;
      }
  }

  return inverse;
}
