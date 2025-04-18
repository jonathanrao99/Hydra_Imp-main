import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { MediaContent } from '../hooks/useMediaContent'
import DatePicker from 'react-datepicker'
import type { DatePickerProps } from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

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
  date: string
  image_url: string
  excerpt: string
  link: string
  created_at: string
}

interface LiveUpdateFormData {
  title: string
  link_to_news_id?: number
  direct_link?: string
}

interface MediaContentFormData {
  title?: string
  description?: string
  file_url: string
  page_section: 'asset_protection' | 'disaster_response' | 'traffic_management' | 'advertisement'
}

interface FireNOCApplication {
  id: string
  name: string
  email: string
  phone: string
  address: string
  propertyType: string
  propertyArea: number
  floors: number
  propertyAddress: string
  buildingPlanUrl: string
  ownershipUrl: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
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
    page_section: 'asset_protection'
  })

  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [newsItems, setNewsItems] = useState<NewsItem[]>([])
  const [mediaContent, setMediaContent] = useState<MediaContent[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [newsImage, setNewsImage] = useState<string | null>(null)
  const [liveUpdates, setLiveUpdates] = useState<any[]>([])

  // Add state for selected files preview
  const [selectedFilesPreview, setSelectedFilesPreview] = useState<{ file: File; preview: string }[]>([])

  // Add state for news popup
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null)

  const [fireNOCApplications, setFireNOCApplications] = useState<FireNOCApplication[]>([])
  const [selectedApplication, setSelectedApplication] = useState<FireNOCApplication | null>(null)

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
        .select('id, title, date, image_url, excerpt, link, created_at')
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

  const fetchLiveUpdates = async () => {
    try {
      console.log('Fetching live updates...')
      const { data, error } = await supabase
        .from('live_updates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching live updates:', error)
        throw error
      }

      console.log('Fetched live updates:', data)
      setLiveUpdates(data || [])
    } catch (err) {
      console.error('Error in fetchLiveUpdates:', err)
      setError(err instanceof Error ? err.message : 'Error fetching live updates')
    }
  }

  useEffect(() => {
    console.log('Component mounted, fetching live updates...')
    fetchLiveUpdates()
  }, [])

  // Set up real-time subscriptions
  useEffect(() => {
    // Subscribe to live updates changes
    const liveUpdatesSubscription = supabase
      .channel('live_updates_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_updates' }, () => {
        fetchLiveUpdates()
      })
      .subscribe()

    // Subscribe to media content changes
    const mediaContentSubscription = supabase
      .channel('media_content_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'media_content' }, () => {
        fetchMediaContent()
      })
      .subscribe()

    // Subscribe to news changes
    const newsSubscription = supabase
      .channel('news_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news' }, () => {
        fetchNewsItems()
      })
      .subscribe()

    // Cleanup subscriptions on unmount
    return () => {
      liveUpdatesSubscription.unsubscribe()
      mediaContentSubscription.unsubscribe()
      newsSubscription.unsubscribe()
    }
  }, [])

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
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Validate file types
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      return isImage || isVideo
    })

    if (validFiles.length === 0) {
      setError('Unsupported file type. Please upload images (JPEG, PNG, GIF) or videos (MP4, WebM) only.')
      e.target.value = '' // Clear the file input
      return
    }

    // Create previews for the files
    const newPreviews = validFiles.map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : ''
    }))

    setSelectedFilesPreview(prev => [...prev, ...newPreviews])
    setSelectedFiles(prev => [...prev, ...validFiles])
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFilesPreview(prev => {
      const newPreviews = [...prev]
      // Revoke the object URL to prevent memory leaks
      if (newPreviews[index].preview) {
        URL.revokeObjectURL(newPreviews[index].preview)
      }
      newPreviews.splice(index, 1)
      return newPreviews
    })
    setSelectedFiles(prev => {
      const newFiles = [...prev]
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const uploadFile = async (file: File) => {
    try {
      setUploading(true)
      setUploadProgress(0)

      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('media_content')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('media_content')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error uploading file')
      return null
    }
  }

  const handleNewsFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, GIF)')
      e.target.value = '' // Clear the file input
      return
    }

    try {
      setUploading(true)
      setUploadProgress(0)

      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('media_content')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('media_content')
        .getPublicUrl(filePath)

      setNewsImage(data.publicUrl)
      setNewsForm(prev => ({ ...prev, image_url: data.publicUrl }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error uploading file')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleNewsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const formattedDate = selectedDate ? selectedDate.toISOString().split('T')[0] : ''
      
      const { error } = await supabase
        .from('news')
        .insert([{
          ...newsForm,
          date: formattedDate
        }])

      if (error) throw error

      setNewsForm({
        title: '',
        date: '',
        image_url: '',
        excerpt: '',
        link: ''
      })
      setSelectedDate(null)
      setNewsImage(null)
      fetchNewsItems()
      alert('News item added successfully!')
    } catch (error) {
      console.error('Error adding news item:', error)
      setError('Error adding news item')
    }
  }

  const handleLiveUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      console.log('Submitting live update:', liveUpdateForm)
      const { data, error } = await supabase
        .from('live_updates')
        .insert([{ 
          title: liveUpdateForm.title,
          link_to_news_id: liveUpdateForm.link_to_news_id || null,
          direct_link: liveUpdateForm.direct_link || null
        }])
        .select()

      if (error) {
        console.error('Error inserting live update:', error)
        throw error
      }

      console.log('Successfully inserted live update:', data)
      
      setLiveUpdateForm({ 
        title: '', 
        link_to_news_id: undefined,
        direct_link: ''
      })
      
      await fetchLiveUpdates()
      showAlert('Live update added successfully!')
    } catch (error) {
      console.error('Error in handleLiveUpdateSubmit:', error)
      showAlert('Error adding live update', 'error')
    }
  }

  const handleMediaContentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedFiles.length === 0) {
      setError('Please select at least one file to upload')
      return
    }

    try {
      const uploadPromises = selectedFiles.map(async (file) => {
        const fileUrl = await uploadFile(file)
        if (!fileUrl) return null

        const fileType = file.type.startsWith('image/') ? 'image' : 'video'

        const { error } = await supabase
          .from('media_content')
          .insert([{
            ...mediaContentForm,
            file_url: fileUrl,
            file_type: fileType
          }])

        if (error) throw error
        return fileUrl
      })

      const results = await Promise.all(uploadPromises)
      const successfulUploads = results.filter(url => url !== null)

      if (successfulUploads.length > 0) {
        setMediaContentForm({
          title: '',
          description: '',
          file_url: '',
          page_section: 'asset_protection'
        })
        setSelectedFiles([])
        fetchMediaContent()
        alert(`Successfully uploaded ${successfulUploads.length} file(s)!`)
      }
    } catch (error) {
      console.error('Error adding media content:', error)
      setError('Error adding media content')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDeleteLiveUpdate = async (id: number) => {
    const confirmed = await showConfirm('Are you sure you want to delete this live update?')
    if (!confirmed) return

    try {
      console.log('Deleting live update with ID:', id) // Debug log
      const { error } = await supabase
        .from('live_updates')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting live update:', error)
        throw error
      }

      console.log('Successfully deleted live update') // Debug log
      await fetchLiveUpdates() // Ensure we wait for the fetch to complete
      showAlert('Live update deleted successfully!')
    } catch (err) {
      console.error('Error in handleDeleteLiveUpdate:', err)
      showAlert(err instanceof Error ? err.message : 'Error deleting live update', 'error')
    }
  }

  const handleDeleteMediaContent = async (id: string | number, fileUrl: string) => {
    const confirmed = await showConfirm('Are you sure you want to delete this media content?')
    if (!confirmed) return

    try {
      const filePath = fileUrl.split('/').pop()
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('media_content')
          .remove([filePath])

        if (storageError) throw storageError
      }

      const { error } = await supabase
        .from('media_content')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchMediaContent()
      showAlert('Media content deleted successfully!')
    } catch (err) {
      showAlert(err instanceof Error ? err.message : 'Error deleting media content', 'error')
    }
  }

  const handleDeleteNews = async (id: number, imageUrl: string) => {
    try {
      // Delete the image from storage if it exists
      if (imageUrl) {
        const filePath = imageUrl.split('/').pop()
        if (filePath) {
          const { error: storageError } = await supabase.storage
            .from('media_content')
            .remove([filePath])

          if (storageError) throw storageError
        }
      }

      // Delete the news item from the database
      const { error } = await supabase
        .from('news')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Refresh the news items list
      await fetchNewsItems()
      showAlert('News item deleted successfully!')
    } catch (error) {
      console.error('Error deleting news item:', error)
      showAlert('Error deleting news item', 'error')
    }
  }

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date)
  }

  // Custom alert function with better styling
  const showAlert = (message: string, type: 'success' | 'error' = 'success') => {
    const alertDiv = document.createElement('div')
    alertDiv.className = `fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg transform transition-all duration-300 ${
      type === 'success' 
        ? 'bg-green-100 border border-green-400 text-green-700' 
        : 'bg-red-100 border border-red-400 text-red-700'
    }`
    alertDiv.innerHTML = `
      <div class="flex items-center">
        <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${
            type === 'success' 
              ? 'M5 13l4 4L19 7' 
              : 'M6 18L18 6M6 6l12 12'
          }"/>
        </svg>
        <span class="font-medium">${message}</span>
      </div>
    `
    document.body.appendChild(alertDiv)
    setTimeout(() => {
      alertDiv.style.opacity = '0'
      alertDiv.style.transform = 'translateY(-20px)'
      setTimeout(() => alertDiv.remove(), 300)
    }, 3000)
  }

  // Custom confirm function with better styling
  const showConfirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const confirmDiv = document.createElement('div')
      confirmDiv.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'
      
      const handleConfirm = (result: boolean) => {
        confirmDiv.remove()
        resolve(result)
      }

      confirmDiv.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 transform transition-all duration-300">
          <div class="flex items-center mb-4">
            <svg class="w-8 h-8 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <h3 class="text-xl font-semibold text-gray-900">Confirm Action</h3>
          </div>
          <p class="text-gray-600 mb-6">${message}</p>
          <div class="flex justify-end space-x-4">
            <button class="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200" id="cancelBtn">
              Cancel
            </button>
            <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200" id="confirmBtn">
              Confirm
            </button>
          </div>
        </div>
      `

      document.body.appendChild(confirmDiv)

      // Add event listeners after the element is in the DOM
      const cancelBtn = confirmDiv.querySelector('#cancelBtn')
      const confirmBtn = confirmDiv.querySelector('#confirmBtn')

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => handleConfirm(false))
      }
      if (confirmBtn) {
        confirmBtn.addEventListener('click', () => handleConfirm(true))
      }
    })
  }

  const fetchFireNOCApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('fire_noc_applications')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setFireNOCApplications(data || [])
    } catch (error) {
      console.error('Error fetching Fire NOC applications:', error)
    }
  }

  const handleUpdateApplicationStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('fire_noc_applications')
        .update({ status })
        .eq('id', id)

      if (error) throw error
      await fetchFireNOCApplications()
    } catch (error) {
      console.error('Error updating application status:', error)
    }
  }

  useEffect(() => {
    fetchFireNOCApplications()
  }, [])

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
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 text-transparent bg-clip-text">Admin Panel</h1>
        <button
          onClick={handleLogout}
          className="bg-gradient-to-r from-red-600 to-red-800 text-white py-2 px-6 rounded-lg hover:from-red-700 hover:to-red-900 focus:outline-none focus:ring-0 transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
        >
          Logout
        </button>
      </div>

      {/* Live Updates Section */}
      <div className="mb-12">
        <h2 className="text-3xl font-semibold mb-6 bg-gradient-to-r from-blue-600 to-blue-800 text-transparent bg-clip-text">Live Updates</h2>
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border border-gray-100 hover:shadow-xl transition-all duration-300">
          <form onSubmit={handleLiveUpdateSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="title" className="block text-base font-medium text-gray-700">
                Title
              </label>
              <input
                type="text"
                id="title"
                value={liveUpdateForm.title}
                onChange={(e) => setLiveUpdateForm({ ...liveUpdateForm, title: e.target.value })}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-0 focus:outline-none transition-all duration-200 text-base"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="link_to_news" className="block text-base font-medium text-gray-700">
                Link to News Item (Optional)
              </label>
              <select
                id="link_to_news"
                value={liveUpdateForm.link_to_news_id || ''}
                onChange={(e) => setLiveUpdateForm({ 
                  ...liveUpdateForm, 
                  link_to_news_id: e.target.value ? Number(e.target.value) : undefined,
                  direct_link: e.target.value ? '' : liveUpdateForm.direct_link
                })}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-0 focus:outline-none transition-all duration-200 text-base"
              >
                <option value="">Select a news item</option>
                {newsItems.map((news) => (
                  <option key={news.id} value={news.id}>
                    {news.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="direct_link" className="block text-base font-medium text-gray-700">
                Direct Link (Optional)
              </label>
              <input
                type="text"
                id="direct_link"
                value={liveUpdateForm.direct_link}
                onChange={(e) => setLiveUpdateForm({ 
                  ...liveUpdateForm, 
                  direct_link: e.target.value,
                  link_to_news_id: e.target.value ? undefined : liveUpdateForm.link_to_news_id
                })}
                placeholder="https://example.com"
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-0 focus:outline-none transition-all duration-200 text-base"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Add Live Update
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider">Link</th>
                <th className="px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                <th className="px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {liveUpdates.map((update) => (
                <tr key={update.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-base">{update.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-base">
                    {update.link_to_news_id ? `News ID: ${update.link_to_news_id}` : update.direct_link}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base">
                    {new Date(update.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleDeleteLiveUpdate(update.id)}
                      className="text-red-600 hover:text-red-900 text-base"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Media Content Section */}
      <div className="mb-12">
        <h2 className="text-3xl font-semibold mb-6 bg-gradient-to-r from-blue-600 to-blue-800 text-transparent bg-clip-text">Media Content</h2>
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border border-gray-100 hover:shadow-xl transition-all duration-300">
          <form onSubmit={handleMediaContentSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-base font-medium text-gray-700">Title (Optional)</label>
              <input
                type="text"
                value={mediaContentForm.title || ''}
                onChange={(e) => setMediaContentForm(prev => ({ ...prev, title: e.target.value }))}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-0 focus:outline-none transition-all duration-200 text-base"
                placeholder="Enter title (optional)"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-base font-medium text-gray-700">Description (Optional)</label>
              <textarea
                value={mediaContentForm.description || ''}
                onChange={(e) => setMediaContentForm(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-0 focus:outline-none transition-all duration-200 text-base"
                placeholder="Enter description (optional)"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-base font-medium text-gray-700">File</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-500 transition-all duration-200">
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>Upload a file</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        onChange={handleFileChange}
                        accept="image/*,video/*"
                        multiple
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
              </div>

              {/* Selected files preview */}
              {selectedFilesPreview.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {selectedFilesPreview.map((preview, index) => (
                    <div key={index} className="relative group">
                      {preview.preview ? (
                        <img
                          src={preview.preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-gray-500">Video File</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="block text-base font-medium text-gray-700">Page Section</label>
              <select
                value={mediaContentForm.page_section}
                onChange={(e) => setMediaContentForm(prev => ({ ...prev, page_section: e.target.value as MediaContentFormData['page_section'] }))}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-0 focus:outline-none transition-all duration-200 text-base"
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
              className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Add Media Content
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mediaContent.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-4">
                <h3 className="font-bold mb-2 text-lg">{item.title}</h3>
                <p className="text-base text-gray-600 mb-2">{item.description}</p>
                <div className="mb-2">
                  {item.file_type === 'image' ? (
                    <img src={item.file_url} alt={item.title} className="w-full h-48 object-cover rounded-lg" />
                  ) : (
                    <video src={item.file_url} controls className="w-full h-48 rounded-lg" />
                  )}
                </div>
                <p className="text-base text-gray-500 mb-2">Section: {item.page_section}</p>
                <button
                  onClick={() => handleDeleteMediaContent(item.id, item.file_url)}
                  className="text-red-600 hover:text-red-900 text-base"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* News Section */}
      <div>
        <h2 className="text-3xl font-semibold mb-6 bg-gradient-to-r from-blue-600 to-blue-800 text-transparent bg-clip-text">News</h2>
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border border-gray-100 hover:shadow-xl transition-all duration-300">
          <form onSubmit={handleNewsSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-lg font-medium text-gray-700">Title</label>
              <input
                type="text"
                value={newsForm.title}
                onChange={(e) => setNewsForm(prev => ({ ...prev, title: e.target.value }))}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-0 focus:outline-none transition-all duration-200 text-lg"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-lg font-medium text-gray-700">Date</label>
              <DatePicker
                selected={selectedDate}
                onChange={handleDateChange}
                dateFormat="yyyy-MM-dd"
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-0 focus:outline-none transition-all duration-200 text-lg"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-lg font-medium text-gray-700">Image</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-500 transition-all duration-200">
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="news-image-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>Upload an image</span>
                      <input
                        id="news-image-upload"
                        name="news-image-upload"
                        type="file"
                        className="sr-only"
                        onChange={handleNewsFileChange}
                        accept="image/*"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
              </div>
              {uploading && <p className="text-sm text-gray-500">Uploading...</p>}
              {newsImage && (
                <div className="mt-2">
                  <img src={newsImage} alt="Preview" className="max-h-48 rounded-lg shadow-md" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="block text-lg font-medium text-gray-700">Excerpt</label>
              <textarea
                value={newsForm.excerpt}
                onChange={(e) => setNewsForm(prev => ({ ...prev, excerpt: e.target.value }))}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-0 focus:outline-none transition-all duration-200 text-lg"
                required
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-lg font-medium text-gray-700">Link (Optional)</label>
              <input
                type="text"
                value={newsForm.link}
                onChange={(e) => setNewsForm(prev => ({ ...prev, link: e.target.value }))}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-0 focus:outline-none transition-all duration-200 text-lg"
                placeholder="https://example.com"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
            >
              Add News
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {newsItems.map((news) => (
            <div 
              key={news.id} 
              className="bg-white rounded-xl shadow-lg overflow-hidden"
            >
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-xl">{news.title}</h3>
                  <button
                    onClick={() => handleDeleteNews(news.id, news.image_url)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-lg text-gray-600 mb-2">{news.excerpt}</p>
                {news.image_url && (
                  <img src={news.image_url} alt={news.title} className="w-full h-48 object-cover rounded-lg mb-2" />
                )}
                <p className="text-lg text-gray-500 mb-2">Date: {news.date}</p>
                {news.link && (
                  <a 
                    href={news.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-600 hover:text-blue-800 text-lg"
                  >
                    Read more
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fire NOC Applications Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Fire NOC Applications</h2>
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applicant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fireNOCApplications.map((application) => (
                  <tr key={application.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{application.name}</div>
                      <div className="text-sm text-gray-500">{application.email}</div>
                      <div className="text-sm text-gray-500">{application.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {application.propertyType.charAt(0).toUpperCase() + application.propertyType.slice(1)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {application.propertyArea} sq ft, {application.floors} floors
                      </div>
                      <div className="text-sm text-gray-500">{application.propertyAddress}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        application.status === 'approved' ? 'bg-green-100 text-green-800' :
                        application.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(application.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedApplication(application)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        View Details
                      </button>
                      {application.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleUpdateApplicationStatus(application.id, 'approved')}
                            className="text-green-600 hover:text-green-900 mr-4"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleUpdateApplicationStatus(application.id, 'rejected')}
                            className="text-red-600 hover:text-red-900"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Application Details Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Application Details</h3>
              <button
                onClick={() => setSelectedApplication(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Personal Information</h4>
                <dl className="mt-2 space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                    <dd className="text-sm text-gray-900">{selectedApplication.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="text-sm text-gray-900">{selectedApplication.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="text-sm text-gray-900">{selectedApplication.phone}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Address</dt>
                    <dd className="text-sm text-gray-900">{selectedApplication.address}</dd>
                  </div>
                </dl>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Property Details</h4>
                <dl className="mt-2 space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Type</dt>
                    <dd className="text-sm text-gray-900">
                      {selectedApplication.propertyType.charAt(0).toUpperCase() + selectedApplication.propertyType.slice(1)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Area</dt>
                    <dd className="text-sm text-gray-900">{selectedApplication.propertyArea} sq ft</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Floors</dt>
                    <dd className="text-sm text-gray-900">{selectedApplication.floors}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Property Address</dt>
                    <dd className="text-sm text-gray-900">{selectedApplication.propertyAddress}</dd>
                  </div>
                </dl>
              </div>
            </div>
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-500">Documents</h4>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <a
                    href={selectedApplication.buildingPlanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-900 text-sm"
                  >
                    View Building Plan
                  </a>
                </div>
                <div>
                  <a
                    href={selectedApplication.ownershipUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-900 text-sm"
                  >
                    View Ownership Document
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPanel 