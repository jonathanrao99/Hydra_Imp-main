import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

interface MediaItem {
  id: number
  title: string
  description: string
  file_url: string
  file_type: 'image' | 'video'
  page_section: 'asset_protection' | 'disaster_response' | 'traffic_management' | 'advertisement'
  created_at: string
}

const MediaManager = () => {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [selectedSection, setSelectedSection] = useState<MediaItem['page_section']>('asset_protection')
  const [newMedia, setNewMedia] = useState({
    title: '',
    description: '',
    file: null as File | null,
    file_type: 'image' as 'image' | 'video'
  })
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchMediaItems()
  }, [selectedSection])

  const fetchMediaItems = async () => {
    const { data, error } = await supabase
      .from('media_content')
      .select('*')
      .eq('page_section', selectedSection)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching media items:', error)
      return
    }

    setMediaItems(data || [])
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setNewMedia(prev => ({ ...prev, file }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMedia.file) return

    setUploading(true)
    try {
      // Upload file to Supabase Storage
      const fileExt = newMedia.file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${selectedSection}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, newMedia.file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath)

      // Add metadata to database
      const { error: dbError } = await supabase
        .from('media_content')
        .insert([{
          title: newMedia.title,
          description: newMedia.description,
          file_url: publicUrl,
          file_type: newMedia.file_type,
          page_section: selectedSection
        }])

      if (dbError) throw dbError

      // Reset form and refresh list
      setNewMedia({
        title: '',
        description: '',
        file: null,
        file_type: 'image'
      })
      fetchMediaItems()
    } catch (error) {
      console.error('Error uploading media:', error)
      alert('Error uploading media')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: number, fileUrl: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      // Delete from storage
      const filePath = fileUrl.split('/').pop()
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('media')
          .remove([`${selectedSection}/${filePath}`])

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
      <h1 className="text-3xl font-bold mb-8">Media Manager</h1>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Page Section
        </label>
        <select
          value={selectedSection}
          onChange={(e) => setSelectedSection(e.target.value as MediaItem['page_section'])}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="asset_protection">Asset Protection</option>
          <option value="disaster_response">Disaster Response</option>
          <option value="traffic_management">Traffic Management</option>
          <option value="advertisement">Advertisement Wing</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Add New Media Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Add New Media</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                type="text"
                value={newMedia.title}
                onChange={(e) => setNewMedia({ ...newMedia, title: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                File Type
              </label>
              <select
                value={newMedia.file_type}
                onChange={(e) => setNewMedia({ ...newMedia, file_type: e.target.value as 'image' | 'video' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                File
              </label>
              <input
                type="file"
                accept={newMedia.file_type === 'image' ? 'image/*' : 'video/*'}
                onChange={handleFileUpload}
                className="mt-1 block w-full"
                required
              />
            </div>
            <button
              type="submit"
              disabled={uploading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload Media'}
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
                  </div>
                  <button
                    onClick={() => handleDelete(item.id, item.file_url)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
                {item.file_type === 'image' ? (
                  <img
                    src={item.file_url}
                    alt={item.title}
                    className="mt-2 rounded-lg max-h-40 object-cover"
                  />
                ) : (
                  <video
                    src={item.file_url}
                    controls
                    className="mt-2 rounded-lg max-h-40"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MediaManager 