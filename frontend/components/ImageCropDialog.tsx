"use client"

import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { RotateCw, ZoomIn, Loader2 } from 'lucide-react'

interface ImageCropDialogProps {
  open: boolean
  onClose: () => void
  imageSrc: string
  onCropComplete: (croppedImage: File) => void
  aspectRatio?: number
}

interface CroppedArea {
  x: number
  y: number
  width: number
  height: number
}

interface CroppedAreaPixels {
  x: number
  y: number
  width: number
  height: number
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: CroppedAreaPixels,
  rotation = 0
): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('No 2d context')
  }

  const maxSize = Math.max(image.width, image.height)
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2))

  canvas.width = safeArea
  canvas.height = safeArea

  ctx.translate(safeArea / 2, safeArea / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.translate(-safeArea / 2, -safeArea / 2)

  ctx.drawImage(
    image,
    safeArea / 2 - image.width * 0.5,
    safeArea / 2 - image.height * 0.5
  )

  const data = ctx.getImageData(0, 0, safeArea, safeArea)

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('Canvas is empty'))
      }
    }, 'image/jpeg', 0.95)
  })
}

export default function ImageCropDialog({
  open,
  onClose,
  imageSrc,
  onCropComplete,
  aspectRatio = 1
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CroppedAreaPixels | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const onCropChange = useCallback((location: { x: number; y: number }) => {
    setCrop(location)
  }, [])

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom)
  }, [])

  const onCropCompleteCallback = useCallback(
    (croppedArea: CroppedArea, croppedAreaPixels: CroppedAreaPixels) => {
      setCroppedAreaPixels(croppedAreaPixels)
    },
    []
  )

  const handleSave = async () => {
    if (!croppedAreaPixels) return

    setIsProcessing(true)
    try {
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation)
      const croppedImageFile = new File([croppedImageBlob], 'cropped-image.jpg', {
        type: 'image/jpeg'
      })
      onCropComplete(croppedImageFile)
      onClose()
    } catch (error) {
      console.error('Error cropping image:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancel = () => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Crop & Edit Your Image</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Crop Area */}
          <div className="relative h-[400px] bg-black/5 rounded-lg overflow-hidden">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspectRatio}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={onCropCompleteCallback}
              cropShape="round"
              showGrid={false}
            />
          </div>

          {/* Controls */}
          <div className="space-y-4 px-2">
            {/* Zoom Control */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <ZoomIn className="w-4 h-4 text-primary" />
                Zoom: {zoom.toFixed(1)}x
              </Label>
              <Slider
                value={[zoom]}
                onValueChange={(value) => setZoom(value[0])}
                min={1}
                max={3}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Rotation Control */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <RotateCw className="w-4 h-4 text-primary" />
                Rotation: {rotation}°
              </Label>
              <Slider
                value={[rotation]}
                onValueChange={(value) => setRotation(value[0])}
                min={0}
                max={360}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isProcessing}
            className="gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Apply Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
