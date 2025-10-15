import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Area } from 'react-easy-crop/types';

interface ImageCropperProps {
  image: string;
  onCropComplete: (croppedImage: string) => void;
  onCancel: () => void;
}

// 创建裁剪后的图片
const createCroppedImage = async (
  imageSrc: string,
  pixelCrop: Area
): Promise<string> => {
  const image = new Image();
  image.src = imageSrc;

  await new Promise((resolve) => {
    image.onload = resolve;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  // 设置 canvas 大小为裁剪区域大小
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // 绘制裁剪后的图片
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // 转换为 base64
  return canvas.toDataURL('image/jpeg', 0.9);
};

export default function ImageCropper({ image, onCropComplete, onCancel }: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom] = useState(1); // 固定缩放为 1
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropChange = useCallback((location: { x: number; y: number }) => {
    setCrop(location);
  }, []);

  const onCropAreaChange = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropConfirm = useCallback(async () => {
    if (!croppedAreaPixels) return;

    try {
      const croppedImage = await createCroppedImage(image, croppedAreaPixels);
      onCropComplete(croppedImage);
    } catch (error) {
      console.error('裁剪失败:', error);
    }
  }, [image, croppedAreaPixels, onCropComplete]);

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
      <div className="flex-1 relative">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={undefined} // 自由裁剪
          onCropChange={onCropChange}
          onCropComplete={onCropAreaChange}
          zoomWithScroll={false}
          showGrid={true}
          style={{
            containerStyle: {
              backgroundColor: '#000',
            },
            cropAreaStyle: {
              border: '2px solid #fff',
            },
          }}
        />
      </div>

      {/* 底部提示 */}
      <div className="bg-gray-900 text-white text-center py-3 text-sm">
        拖动裁剪框选择需要翻译的区域
      </div>
    </div>
  );
}

