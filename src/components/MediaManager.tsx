import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabaseClient'

interface MediaItem {
  id: string
  title: string
  description: string
  file_url: string
  file_type: 'image' | 'video'
  page_section: string
  created_at: string
}

interface NewMedia {
  title: string
  description: string
  file_type: 'image' | 'video'
  page_section: string
}

const MediaManager = () => {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const [newMedia, setNewMedia] = useState<NewMedia>({
    title: '',
    description: '',
    file_type: 'image',
    page_section: 'asset_protection'
  })

  useEffect(() => {
    fetchMediaItems()
  }, [])

  const showError = (message: string) => {
    setError(message)
    setTimeout(() => setError(null), 3000)
  }

  const generateVideoThumbnail = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.playsInline = true
      video.muted = true

      video.onloadeddata = () => {
        video.currentTime = 1
      }

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
          const thumbnailUrl = canvas.toDataURL('image/jpeg')
          URL.revokeObjectURL(video.src)
          resolve(thumbnailUrl)
        } catch (err) {
          reject(err)
        }
      }

      video.onerror = () => {
        reject(new Error('Error loading video'))
      }

      video.src = URL.createObjectURL(file)
    })
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    const file = e.target.files?.[0]
    if (!file) {
      showError('Please select a file to upload')
      return
    }

    setSelectedFile(file)

    try {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setFilePreview(reader.result as string)
        }
        reader.readAsDataURL(file)
      } else if (file.type.startsWith('video/')) {
        const thumbnail = await generateVideoThumbnail(file)
        setFilePreview(thumbnail)
      }
    } catch (error) {
      console.error('Error generating preview:', error)
      showError('Error generating preview')
    }
  }

  const uploadWithProgress = async (file: File, path: string) => {
    try {
      const chunkSize = 1024 * 1024 // 1MB chunks
      const totalSize = file.size
      let uploadedSize = 0

      // Split file into chunks and upload
      for (let start = 0; start < file.size; start += chunkSize) {
        const chunk = file.slice(start, start + chunkSize)
        const { error } = await supabase.storage
          .from('media')
          .upload(`${path}_${start}`, chunk, {
            upsert: true
          })

        if (error) throw error

        uploadedSize += chunk.size
        const progress = (uploadedSize / totalSize) * 100
        setUploadProgress(Math.min(progress, 99)) // Cap at 99% until final processing
      }

      // Final upload with the complete file
      const { error: finalError } = await supabase.storage
        .from('media')
        .upload(path, file, { upsert: true })

      if (finalError) throw finalError

      setUploadProgress(100)
    } catch (error) {
      throw error
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (!newMedia.title.trim()) {
      showError('Please enter a title')
      return
    }

    if (!selectedFile) {
      showError('Please select a file to upload')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${newMedia.page_section}/${fileName}`

      // Upload file with progress tracking
      await uploadWithProgress(selectedFile, filePath)

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath)

      const { error: dbError } = await supabase
        .from('media_content')
        .insert([
          {
            title: newMedia.title,
            description: newMedia.description,
            file_url: publicUrl,
            file_type: selectedFile.type.startsWith('image/') ? 'image' : 'video',
            page_section: newMedia.page_section
          }
        ])

      if (dbError) throw dbError

      // Reset form
      if (formRef.current) {
        formRef.current.reset()
      }
      setNewMedia({
        title: '',
        description: '',
        file_type: 'image',
        page_section: 'asset_protection'
      })
      setSelectedFile(null)
      setFilePreview(null)
      fetchMediaItems()
    } catch (error: any) {
      console.error('Error:', error)
      showError(error.message || 'Error uploading media')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const fetchMediaItems = async () => {
    const { data, error } = await supabase
      .from('media_content')
      .select('*')
      .eq('page_section', newMedia.page_section)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching media items:', error)
      return
    }

    setMediaItems(data || [])
  }

  const handleDelete = async (id: string, fileUrl: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      // Delete from storage
      const filePath = fileUrl.split('/').pop()
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('media')
          .remove([`${newMedia.page_section}/${filePath}`])

        if (storageError) throw storageError
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('media_content')
        .delete()
        .eq('id', id)

      if (dbError) throw dbError

      fetchMediaItems()
    } catch (error) {
      console.error('Error deleting media:', error)
      alert('Error deleting media')
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {error && (
        <div 
          className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded shadow-lg z-50 flex items-center space-x-2"
          style={{ 
            animation: 'fadeIn 0.3s ease-in-out',
            WebkitAnimation: 'fadeIn 0.3s ease-in-out'
          }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">{error}</span>
        </div>
      )}

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translate(-50%, -20px); }
            to { opacity: 1; transform: translate(-50%, 0); }
          }
          @-webkit-keyframes fadeIn {
            from { opacity: 0; transform: translate(-50%, -20px); }
            to { opacity: 1; transform: translate(-50%, 0); }
          }
        `}
      </style>

      <h1 className="text-3xl font-bold mb-8">Media Manager</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Add New Media</h2>
          <form 
            ref={formRef} 
            onSubmit={handleSubmit} 
            className="space-y-4"
            noValidate
          >
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newMedia.title}
                onChange={(e) => setNewMedia({ ...newMedia, title: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={newMedia.description}
                onChange={(e) => setNewMedia({ ...newMedia, description: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows={3}
                placeholder="Enter description (optional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                File Type <span className="text-red-500">*</span>
              </label>
              <select
                value={newMedia.file_type}
                onChange={(e) => setNewMedia({ ...newMedia, file_type: e.target.value as 'image' | 'video' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                File <span className="text-red-500">*</span>
              </label>
              <div 
                className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-blue-500 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept={newMedia.file_type === 'image' ? 'image/*' : 'video/*'}
                      onChange={handleFileChange}
                      required
                    />
                    <p className="pl-1">Click to upload or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {newMedia.file_type === 'image' ? 'PNG, JPG, GIF up to 10MB' : 'MP4, WebM up to 50MB'}
                  </p>
                </div>
              </div>
              {selectedFile && (
                <p className="mt-2 text-sm text-green-600">
                  Selected file: {selectedFile.name}
                </p>
              )}
            </div>

            {/* File Preview */}
            {filePreview && (
              <div className="mt-4">
                {newMedia.file_type === 'image' ? (
                  <img
                    src={filePreview}
                    alt="Preview"
                    className="max-h-48 w-full rounded-lg object-contain bg-gray-50"
                  />
                ) : (
                  <div className="relative aspect-video bg-gray-50 rounded-lg overflow-hidden">
                    <img
                      src={filePreview}
                      alt="Video Thumbnail"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black bg-opacity-50 rounded-full p-3">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Upload Progress Bar */}
            {uploading && (
              <div className="space-y-2">
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300 ease-out rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 text-center">
                  Uploading... {Math.round(uploadProgress)}%
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Add Media'}
            </button>
          </form>
        </div>

        {/* Media List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Current Media</h2>
          <div className="space-y-4">
            {mediaItems.map((item) => (
              <div key={item.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-gray-600">{item.description}</p>
                    <p className="text-sm text-gray-500">Section: {item.page_section}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id, item.file_url)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
                <div className="mt-4">
                  {item.file_type === 'image' ? (
                    <img
                      src={item.file_url}
                      alt={item.title}
                      className="max-h-48 rounded-lg object-contain"
                    />
                  ) : (
                    <video
                      src={item.file_url}
                      controls
                      className="max-h-48 w-full rounded-lg"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MediaManager 
export default MediaManager 