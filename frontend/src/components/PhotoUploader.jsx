import { useState, useRef } from 'react'
import { Upload, X, Image, Loader } from 'lucide-react'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function PhotoUploader({ photos, onChange, maxPhotos = 10, minPhotos = 5 }) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef()

  const uploadToCloudinary = async (file) => {
  const sigRes = await api.get('/upload/signature/')
  const { signature, timestamp, api_key, cloud_name } = sigRes.data

  const formData = new FormData()
  formData.append('file', file)
  formData.append('api_key', api_key)
  formData.append('timestamp', timestamp)
  formData.append('signature', signature)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  )

  if (!res.ok) {
    const err = await res.json()
    console.error('Cloudinary error:', err)
    throw new Error(err.error?.message || 'Upload failed')
  }

  const data = await res.json()
  if (data.secure_url) return data.secure_url
  throw new Error('No URL returned from Cloudinary')
}

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return

    const remaining = maxPhotos - photos.length
    if (files.length > remaining) {
      toast.error(`You can only add ${remaining} more photo(s).`)
      return
    }

    setUploading(true)
    try {
      const urls = []
      for (const file of files) {
        // Validate file
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image.`)
          continue
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large. Max 10MB.`)
          continue
        }
        toast.loading(`Uploading ${file.name}...`, { id: file.name })
        const url = await uploadToCloudinary(file)
        urls.push(url)
        toast.success(`${file.name} uploaded!`, { id: file.name })
      }
      onChange([...photos, ...urls])
    } catch (err) {
      toast.error('Upload failed. Check your Cloudinary settings.')
    } finally {
      setUploading(false)
      // Reset input so same file can be selected again
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const removePhoto = (index) => {
    onChange(photos.filter((_, i) => i !== index))
  }

  return (
    <div>
      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {photos.map((url, index) => (
            <div key={index} className="relative group aspect-video">
              <img
                src={url}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover rounded-lg border border-white/10"
              />
              <button
                onClick={() => removePhoto(index)}
                className="absolute top-1 right-1 bg-black/70 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} className="text-white" />
              </button>
              {index === 0 && (
                <span className="absolute bottom-1 left-1 bg-gold text-dark text-xs px-1.5 py-0.5 rounded font-semibold">
                  Cover
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      {photos.length < maxPhotos && (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            uploading
              ? 'border-gold/30 bg-gold/5 cursor-wait'
              : 'border-white/10 hover:border-gold/40 hover:bg-white/5'
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader size={24} className="text-gold animate-spin" />
              <p className="text-white/50 text-sm">Uploading photos...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                <Upload size={20} className="text-gold" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">Click to upload photos</p>
                <p className="text-white/30 text-xs mt-0.5">
                  JPG, PNG, WEBP up to 10MB each
                </p>
              </div>
              <p className="text-white/20 text-xs">
                {photos.length}/{minPhotos} minimum · {photos.length}/{maxPhotos} maximum
              </p>
            </div>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Progress indicator */}
      <div className={`mt-2 text-xs ${photos.length >= minPhotos ? 'text-green-400' : 'text-white/30'}`}>
        {photos.length >= minPhotos
          ? `✓ ${photos.length} photos added — ready to submit`
          : `${photos.length} of ${minPhotos} minimum photos added`
        }
      </div>
    </div>
  )
}