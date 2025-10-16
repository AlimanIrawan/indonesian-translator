import { useState, useRef } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageCropperProps {
  image: string;
  onCropComplete: (croppedImage: string) => void;
  onSkip: () => void;
  onCancel: () => void;
}

// 创建裁剪后的图片
const createCroppedImage = (
  image: HTMLImageElement,
  crop: PixelCrop
): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  // 计算缩放比例
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  // 设置 canvas 大小为裁剪区域的实际像素大小
  canvas.width = crop.width * scaleX;
  canvas.height = crop.height * scaleY;

  // 绘制裁剪后的图片（使用原始图片尺寸）
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  );

  // 转换为 base64
  return canvas.toDataURL('image/jpeg', 0.9);
};

export default function ImageCropper({ image, onCropComplete, onSkip, onCancel }: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    x: 10,
    y: 10,
    width: 80,
    height: 80,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [rotation, setRotation] = useState(0); // 旋转角度：0, 90, 180, 270
  const [rotatedImage, setRotatedImage] = useState(image);
  const imgRef = useRef<HTMLImageElement>(null);

  // 旋转图片
  const handleRotate = () => {
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);

    // 创建 canvas 来旋转图片
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 根据旋转角度调整 canvas 尺寸
      if (newRotation === 90 || newRotation === 270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      // 移动到中心点
      ctx.translate(canvas.width / 2, canvas.height / 2);
      // 旋转
      ctx.rotate((newRotation * Math.PI) / 180);
      // 绘制图片（从中心点）
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      // 转换为 base64
      const rotatedBase64 = canvas.toDataURL('image/jpeg', 0.95);
      setRotatedImage(rotatedBase64);

      // 重置裁剪区域
      setCrop({
        unit: '%',
        x: 10,
        y: 10,
        width: 80,
        height: 80,
      });
    };
    img.src = image;
  };

  const handleCropConfirm = () => {
    if (!imgRef.current || !completedCrop) return;

    try {
      const croppedImage = createCroppedImage(imgRef.current, completedCrop);
      onCropComplete(croppedImage);
    } catch (error) {
      console.error('裁剪失败:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* 顶部操作栏 */}
      <div className="bg-gray-900 text-white p-4 flex justify-between items-center relative z-10">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex-shrink-0"
        >
          取消
        </button>
        <h3 className="text-lg font-semibold flex-1 text-center mx-4">裁剪图片</h3>
        <button
          onClick={handleCropConfirm}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex-shrink-0"
        >
          确认裁剪
        </button>
      </div>

      {/* 裁剪区域 */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-black">
        <ReactCrop
          crop={crop}
          onChange={(c) => setCrop(c)}
          onComplete={(c) => setCompletedCrop(c)}
          className="max-w-full max-h-full"
        >
          <img
            ref={imgRef}
            src={rotatedImage}
            alt="裁剪预览"
            className="max-w-full max-h-full object-contain"
            onLoad={(e) => {
              const { width, height } = e.currentTarget;
              // 初始化裁剪区域（居中，80% 大小）
              setCompletedCrop({
                unit: 'px',
                x: width * 0.1,
                y: height * 0.1,
                width: width * 0.8,
                height: height * 0.8,
              });
            }}
          />
        </ReactCrop>
      </div>

      {/* 底部操作栏 */}
      <div className="bg-gray-900 text-white p-4 relative z-10">
        <div className="text-center mb-3">
          <p className="text-sm mb-1">💡 拖动边框或角落调整裁剪区域</p>
          <p className="text-xs text-gray-400">拖动中间移动裁剪框 · 点击旋转按钮调整方向 · 或直接跳过裁剪</p>
        </div>
        
        {/* 旋转按钮 */}
        <div className="flex justify-center mb-3">
          <button
            onClick={handleRotate}
            className="flex items-center space-x-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors font-medium"
          >
            <i className="fas fa-redo-alt"></i>
            <span>旋转 90°</span>
            {rotation > 0 && <span className="text-xs">({rotation}°)</span>}
          </button>
        </div>

        <div className="flex gap-2 max-w-md mx-auto">
          <button
            onClick={onCancel}
            className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors font-medium"
          >
            取消
          </button>
          <button
            onClick={onSkip}
            className="flex-1 px-4 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors font-medium"
          >
            跳过裁剪
          </button>
          <button
            onClick={handleCropConfirm}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
          >
            确认裁剪
          </button>
        </div>
      </div>
    </div>
  );
}
