import { useState, useRef } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageCropperProps {
  image: string;
  onCropComplete: (croppedImage: string) => void;
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

  // 设置 canvas 大小为裁剪区域大小
  canvas.width = crop.width;
  canvas.height = crop.height;

  // 绘制裁剪后的图片
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );

  // 转换为 base64
  return canvas.toDataURL('image/jpeg', 0.9);
};

export default function ImageCropper({ image, onCropComplete, onCancel }: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    x: 10,
    y: 10,
    width: 80,
    height: 80,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

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
      <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        >
          取消
        </button>
        <h3 className="text-lg font-semibold">裁剪图片</h3>
        <button
          onClick={handleCropConfirm}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
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
            src={image}
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

      {/* 底部提示 */}
      <div className="bg-gray-900 text-white text-center py-3">
        <p className="text-sm mb-1">💡 拖动边框或角落调整裁剪区域</p>
        <p className="text-xs text-gray-400">拖动中间移动裁剪框</p>
      </div>
    </div>
  );
}
