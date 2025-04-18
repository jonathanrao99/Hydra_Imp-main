import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { MediaContent } from '../hooks/useMediaContent'

interface NewsFormData {
  title: string
  date: string
  image_url: string
  excerpt: string
  link: string
}

interface NewsItem {
  id: number
  title: string
}

interface LiveUpdateFormData {
  title: string
  link_to_news_id?: number
  direct_link?: string
}

interface MediaContentFormData {
  title: string
  description: string
  file_url: string
  file_type: 'image' | 'video'
  page_section: 'asset_protection' | 'disaster_response' | 'traffic_management' | 'advertisement'
}

const AdminPanel = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [newsForm, setNewsForm] = useState<NewsFormData>({
    title: '',
    date: '',
    image_url: '',
    excerpt: '',
    link: ''
  })

  const [liveUpdateForm, setLiveUpdateForm] = useState<LiveUpdateFormData>({
    title: '',
    link_to_news_id: undefined,
    direct_link: ''
  })

  const [mediaContentForm, setMediaContentForm] = useState<MediaContentFormData>({
    title: '',
    description: '',
    file_url: '',
    file_type: 'image',
    page_section: 'asset_protection'
  })

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [newsItems, setNewsItems] = useState<NewsItem[]>([])
  const [mediaContent, setMediaContent] = useState<MediaContent[]>([])

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
    }
    checkAuth()
  }, [])

  const fetchNewsItems = async () => {
    try {
      console.log('Fetching news items...')
      const { data, error } = await supabase
        .from('news')
        .select('id, title')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase error:', error)
        setError(`Error fetching news items: ${error.message}`)
        return
      }

      console.log('Fetched news items:', data)
      setNewsItems(data || [])
    } catch (error) {
      console.error('Unexpected error:', error)
      setError(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  useEffect(() => {
    fetchNewsItems()
  }, [])

  useEffect(() => {
    fetchMediaContent()
  }, [])

  const fetchMediaContent = async () => {
    try {
      const { data, error } = await supabase
        .from('media_content')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setMediaContent(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      setIsAuthenticated(true)
    } catch (error) {
      console.error('Error logging in:', error)
      setError('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsAuthenticated(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const fileType = file.type.startsWith('image/') ? 'image' : 
                    file.type.startsWith('video/') ? 'video' : null

    if (!fileType) {
      setError('Please upload either an image or video file')
      return
    }

    setSelectedFile(file)
    setMediaContentForm(prev => ({ ...prev, file_type: fileType }))
  }

  const uploadFile = async () => {
    if (!selectedFile) return null

    try {
      setUploading(true)
      setUploadProgress(0)

      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('media_content')
        .upload(filePath, selectedFile)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('media_content')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error uploading file')
      return null
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleNewsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      console.log('Submitting news item:', newsForm)
      const { error } = await supabase
        .from('news')
        .insert([newsForm])

      if (error) {
        console.error('Supabase error:', error)
        setError(`Error adding news item: ${error.message}`)
        return
      }

      console.log('News item added successfully')
      setNewsForm({
        title: '',
        date: '',
        image_url: '',
        excerpt: '',
        link: ''
      })
      fetchNewsItems()
    } catch (error) {
      console.error('Unexpected error:', error)
      setError(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleLiveUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data, error } = await supabase
        .from('live_updates')
        .insert([{ 
          title: liveUpdateForm.title,
          link_to_news_id: liveUpdateForm.link_to_news_id || null,
          direct_link: liveUpdateForm.direct_link || null
        }])
        .select()

      if (error) throw error

      setLiveUpdateForm({ 
        title: '', 
        link_to_news_id: undefined,
        direct_link: ''
      })
      alert('Live update added successfully!')
    } catch (error) {
      console.error('Error adding live update:', error)
      alert('Error adding live update')
    }
  }

  const handleMediaContentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const fileUrl = await uploadFile()
      if (!fileUrl) return

      const { error } = await supabase
        .from('media_content')
        .insert([{ ...mediaContentForm, file_url: fileUrl }])

      if (error) throw error

      setMediaContentForm({
        title: '',
        description: '',
        file_url: '',
        file_type: 'image',
        page_section: 'asset_protection'
      })
      setSelectedFile(null)
      fetchMediaContent()
    } catch (error) {
      console.error('Error adding media content:', error)
      alert('Error adding media content')
    }
  }

  const handleDelete = async (id: string, fileUrl: string) => {
    try {
      // Extract file path from URL
      const filePath = fileUrl.split('/').pop()
      if (filePath) {
        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('media_content')
          .remove([filePath])

        if (storageError) throw storageError
      }

      // Delete from database
      const { error } = await supabase
        .from('media_content')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchMediaContent()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Admin Login
            </h2>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email-address" className="sr-only">
                  Email address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Logout
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* News Form */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Add News Item</h2>
          <form onSubmit={handleNewsSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                value={newsForm.title}
                onChange={(e) => setNewsForm(prev => ({ ...prev, title: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input
                type="text"
                value={newsForm.date}
                onChange={(e) => setNewsForm(prev => ({ ...prev, date: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Image</label>
              <input
                type="file"
                onChange={handleFileChange}
                className="mt-1 block w-full"
                accept="image/*"
              />
              {uploading && <p className="text-sm text-gray-500">Uploading...</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Excerpt</label>
              <textarea
                value={newsForm.excerpt}
                onChange={(e) => setNewsForm(prev => ({ ...prev, excerpt: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Link</label>
              <input
                type="text"
                value={newsForm.link}
                onChange={(e) => setNewsForm(prev => ({ ...prev, link: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Add News
            </button>
          </form>
        </div>

        {/* Live Updates Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Add Live Update</h2>
          <form onSubmit={handleLiveUpdateSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                type="text"
                id="title"
                value={liveUpdateForm.title}
                onChange={(e) => setLiveUpdateForm({ ...liveUpdateForm, title: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="link_to_news" className="block text-sm font-medium text-gray-700">
                Link to News Item (Optional)
              </label>
              <select
                id="link_to_news"
                value={liveUpdateForm.link_to_news_id || ''}
                onChange={(e) => setLiveUpdateForm({ 
                  ...liveUpdateForm, 
                  link_to_news_id: e.target.value ? Number(e.target.value) : undefined,
                  direct_link: e.target.value ? '' : liveUpdateForm.direct_link // Clear direct link if news item is selected
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select a news item</option>
                {newsItems.map((news) => (
                  <option key={news.id} value={news.id}>
                    {news.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="direct_link" className="block text-sm font-medium text-gray-700">
                Direct Link (Optional)
              </label>
              <input
                type="text"
                id="direct_link"
                value={liveUpdateForm.direct_link}
                onChange={(e) => setLiveUpdateForm({ 
                  ...liveUpdateForm, 
                  direct_link: e.target.value,
                  link_to_news_id: e.target.value ? undefined : liveUpdateForm.link_to_news_id // Clear news item if direct link is entered
                })}
                placeholder="https://example.com"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Add Live Update
            </button>
          </form>
        </div>

        {/* Media Content Form */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Add Media Content</h2>
          <form onSubmit={handleMediaContentSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                value={mediaContentForm.title}
                onChange={(e) => setMediaContentForm(prev => ({ ...prev, title: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={mediaContentForm.description}
                onChange={(e) => setMediaContentForm(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">File</label>
              <input
                type="file"
                onChange={handleFileChange}
                className="mt-1 block w-full"
                accept="image/*,video/*"
              />
              {uploading && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Uploading... {Math.round(uploadProgress)}%</p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">File Type</label>
              <select
                value={mediaContentForm.file_type}
                onChange={(e) => setMediaContentForm(prev => ({ ...prev, file_type: e.target.value as 'image' | 'video' }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Page Section</label>
              <select
                value={mediaContentForm.page_section}
                onChange={(e) => setMediaContentForm(prev => ({ ...prev, page_section: e.target.value as MediaContentFormData['page_section'] }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="asset_protection">Asset Protection</option>
                <option value="disaster_response">Disaster Response</option>
                <option value="traffic_management">Traffic Management</option>
                <option value="advertisement">Advertisement</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Add Media Content
            </button>
          </form>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Media Content Management</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mediaContent.map((item) => (
            <div key={item.id} className="border p-4 rounded">
              <h3 className="font-bold mb-2">{item.title}</h3>
              <p className="mb-2">{item.description}</p>
              <div className="mb-2">
                {item.file_type === 'image' ? (
                  <img src={item.file_url} alt={item.title} className="w-full h-48 object-cover rounded" />
                ) : (
                  <video src={item.file_url} controls className="w-full h-48 rounded" />
                )}
              </div>
              <p className="text-sm text-gray-500 mb-2">Section: {item.page_section}</p>
              <button
                onClick={() => handleDelete(item.id, item.file_url)}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AdminPanel 