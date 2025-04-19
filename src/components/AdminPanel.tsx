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
  is_live_update?: boolean
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

// Type definitions for better type safety
interface UploadProgressEvent {
  loaded: number
  total: number
}

interface LiveUpdate {
  id: number
  title: string
  link_to_news_id: number | null
  direct_link: string | null
  created_at: string
}

interface FileOptions {
  cacheControl?: string;
  contentType?: string;
  duplex?: string;
  upsert?: boolean;
  onUploadProgress?: (progress: UploadProgressEvent) => void;
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
  const [newsImage, setNewsImage] = useState<File | null>(null)
  const [liveUpdates, setLiveUpdates] = useState<LiveUpdate[]>([])

  // Add state for selected files preview
  const [selectedFilesPreview, setSelectedFilesPreview] = useState<{ file: File; preview: string }[]>([])

  // Add state for news popup
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null)

  const [fireNOCApplications, setFireNOCApplications] = useState<FireNOCApplication[]>([])
  const [selectedApplication, setSelectedApplication] = useState<FireNOCApplication | null>(null)

  // Optimize authentication check with loading state
  useEffect(() => {
    let mounted = true
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error
        if (mounted) setIsAuthenticated(!!session)
      } catch (err) {
        console.error('Auth error:', err)
        if (mounted) setError('Authentication failed')
      }
    }
    checkAuth()
    return () => { mounted = false }
  }, [])

  // Optimize data fetching with a single function
  const fetchData = async () => {
    try {
      setLoading(true)
      const [newsResponse, mediaResponse, liveUpdatesResponse, fireNOCResponse] = await Promise.all([
        supabase.from('news').select('*').order('created_at', { ascending: false }),
        supabase.from('media_content').select('*').order('created_at', { ascending: false }),
        supabase.from('live_updates').select('*').order('created_at', { ascending: false }),
        supabase.from('fire_noc_applications').select('*').order('created_at', { ascending: false })
      ])

      if (newsResponse.error) throw newsResponse.error
      if (mediaResponse.error) throw mediaResponse.error
      if (liveUpdatesResponse.error) throw liveUpdatesResponse.error
      if (fireNOCResponse.error) throw fireNOCResponse.error

      setNewsItems(newsResponse.data || [])
      setMediaContent(mediaResponse.data || [])
      setLiveUpdates(liveUpdatesResponse.data || [])
      setFireNOCApplications(fireNOCResponse.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      showAlert('Error fetching data. Please refresh the page.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Initial data fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchData()
    }
  }, [isAuthenticated])

  // Optimize file upload with proper type handling and error management
  const uploadWithProgress = async (file: File, path: string, bucket: string): Promise<string> => {
    try {
      const { error: uploadError, data } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) throw uploadError

      // Update progress after successful upload
      setUploadProgress(100)
      
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path)

      return publicUrl
    } catch (error) {
      throw error
    }
  }

  // Optimize media content submission with better error handling and cleanup
  const handleMediaContentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFiles.length) {
      showAlert('Please select at least one file', 'error')
      return
    }

    setUploading(true)
    setUploadProgress(0)
    const uploadedUrls: string[] = []

    try {
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${mediaContentForm.page_section}/${fileName}`

        const publicUrl = await uploadWithProgress(file, filePath, 'media')
        uploadedUrls.push(publicUrl)

        await supabase.from('media_content').insert([{
          title: mediaContentForm.title || file.name,
          description: mediaContentForm.description,
          file_url: publicUrl,
          file_type: file.type.startsWith('image/') ? 'image' : 'video',
          page_section: mediaContentForm.page_section
        }])
      }

      // Reset form and fetch updated data
      setMediaContentForm({
        title: '',
        description: '',
        file_url: '',
        page_section: 'asset_protection'
      })
      setSelectedFiles([])
      setSelectedFilesPreview([])
      await fetchData()
      showAlert('Media content uploaded successfully', 'success')
    } catch (error: any) {
      console.error('Error:', error)
      showAlert(error.message || 'Error uploading media content', 'error')
      // Cleanup any uploaded files if there was an error
      for (const url of uploadedUrls) {
        const filePath = url.split('/').pop()
        if (filePath) {
          await supabase.storage.from('media').remove([filePath])
        }
      }
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  // Optimize news submission with transaction-like behavior
  const handleNewsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    let uploadedFileName: string | null = null

    try {
      let imageUrl = ''
      if (newsImage) {
        const fileExt = newsImage.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        uploadedFileName = fileName
        imageUrl = await uploadWithProgress(newsImage, fileName, 'news-images')
      }

      const formattedDate = selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]

      const { error: newsError } = await supabase
        .from('news')
        .insert([{
          title: newsForm.title,
          date: formattedDate,
          image_url: imageUrl,
          excerpt: newsForm.excerpt,
          link: newsForm.link
        }])

      if (newsError) throw newsError

      // Reset form and fetch updated data
      setNewsForm({
        title: '',
        date: '',
        image_url: '',
        excerpt: '',
        link: ''
      })
      setSelectedDate(null)
      setNewsImage(null)
      await fetchData()
      showAlert('News item added successfully!', 'success')
    } catch (err) {
      showAlert(err instanceof Error ? err.message : 'An error occurred', 'error')
      // Cleanup uploaded image if there was an error
      if (uploadedFileName) {
        await supabase.storage.from('news-images').remove([uploadedFileName])
      }
    } finally {
      setLoading(false)
    }
  }

  // Optimize live update submission with better validation
  const handleLiveUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!liveUpdateForm.title) {
      showAlert('Title is required', 'error')
      return
    }

    try {
      const { error } = await supabase
        .from('live_updates')
        .insert([{
          title: liveUpdateForm.title,
          link_to_news_id: liveUpdateForm.link_to_news_id || null,
          direct_link: liveUpdateForm.direct_link || null
        }])

      if (error) throw error
      
      setLiveUpdateForm({ 
        title: '', 
        link_to_news_id: undefined,
        direct_link: ''
      })
      
      await fetchData()
      showAlert('Live update added successfully!')
    } catch (error) {
      console.error('Error in handleLiveUpdateSubmit:', error)
      showAlert('Error adding live update', 'error')
    }
  }

  // Optimize delete operations with proper cleanup
  const handleDeleteMediaContent = async (id: string | number, fileUrl: string) => {
    const confirmed = await showConfirm('Are you sure you want to delete this media content?')
    if (!confirmed) return

    try {
      const filePath = fileUrl.split('/').pop()
      if (filePath) {
        // Delete from storage first
        const { error: storageError } = await supabase.storage
          .from('media_content')
          .remove([filePath])

        if (storageError) throw storageError
      }

      // Then delete from database
      const { error: dbError } = await supabase
        .from('media_content')
        .delete()
        .eq('id', id)

      if (dbError) throw dbError

      await fetchData()
      showAlert('Media content deleted successfully!')
    } catch (err) {
      showAlert(err instanceof Error ? err.message : 'Error deleting media content', 'error')
    }
  }

  // Set up real-time subscriptions more efficiently
  useEffect(() => {
    if (!isAuthenticated) return

    const subscription = supabase
      .channel('table-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'media_content' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_updates' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fire_noc_applications' }, fetchData)
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [isAuthenticated])

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
    const files = Array.from(e.target.files || [])
    setSelectedFiles(files)

    // Generate previews for selected files
    const previews = await Promise.all(
      files.map(async (file) => {
        let preview = ''
        if (file.type.startsWith('image/')) {
          preview = URL.createObjectURL(file)
        } else if (file.type.startsWith('video/')) {
          try {
            preview = await generateVideoThumbnail(file)
          } catch (error) {
            console.error('Error generating video thumbnail:', error)
            preview = '' // Use a default video thumbnail or placeholder
          }
        }
        return { file, preview }
      })
    )
    setSelectedFilesPreview(previews)
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

      setNewsImage(file)
      setNewsForm(prev => ({ ...prev, image_url: data.publicUrl }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error uploading file')
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
      await fetchData() // Ensure we wait for the fetch to complete
      showAlert('Live update deleted successfully!')
    } catch (err) {
      showAlert(err instanceof Error ? err.message : 'Error deleting live update', 'error')
    }
  }

  const handleDeleteNews = async (id: number, imageUrl: string) => {
    const confirmed = await showConfirm('Are you sure you want to delete this news item?')
    if (!confirmed) return

    try {
      // Delete the image from storage if it exists
      if (imageUrl) {
        const filePath = imageUrl.split('/').pop()
        if (filePath) {
          const { error: storageError } = await supabase.storage
            .from('news-images')
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
      await fetchData()
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

  const handleUpdateApplicationStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('fire_noc_applications')
        .update({ status })
        .eq('id', id)

      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error('Error updating application status:', error)
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

            {/* Upload Progress */}
            {uploading && (
              <div className="space-y-3">
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300 ease-out rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Uploading...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || selectedFiles.length === 0}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? `Uploading... ${Math.round(uploadProgress)}%` : 'Add Media Content'}
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mediaContent.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-4">
                <h3 className="font-bold mb-1 text-lg">{item.title}</h3>
                {item.description && (
                  <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                )}
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
      <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border border-gray-100 hover:shadow-xl transition-all duration-300">
        <h2 className="text-3xl font-semibold mb-6 bg-gradient-to-r from-blue-600 to-blue-800 text-transparent bg-clip-text">News</h2>
        <form onSubmit={handleNewsSubmit} className="space-y-6">
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={newsForm.title}
              onChange={(e) => setNewsForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Date
            </label>
            <DatePicker
              selected={selectedDate}
              onChange={handleDateChange}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors"
              dateFormat="yyyy-MM-dd"
            />
          </div>
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Image
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-500 transition-colors">
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
                <div className="flex text-base text-gray-600">
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
                      accept="image/*"
                      onChange={handleNewsFileChange}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-base text-gray-500">PNG, JPG, GIF up to 10MB</p>
              </div>
            </div>
            {newsImage && (
              <div className="mt-4">
                <img
                  src={URL.createObjectURL(newsImage)}
                  alt="Preview"
                  className="max-h-48 rounded-lg"
                />
              </div>
            )}
          </div>
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Excerpt
            </label>
            <textarea
              value={newsForm.excerpt}
              onChange={(e) => setNewsForm(prev => ({ ...prev, excerpt: e.target.value }))}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors h-32"
              required
            />
          </div>
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Link (Optional)
            </label>
            <input
              type="text"
              value={newsForm.link}
              onChange={(e) => setNewsForm(prev => ({ ...prev, link: e.target.value }))}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-0 focus:border-blue-500 transition-colors"
              placeholder="Enter URL for related content"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white text-base font-semibold py-4 px-6 rounded-lg hover:from-blue-700 hover:to-blue-900 transition-all duration-300 transform hover:scale-[1.02]"
          >
            Add News Item
          </button>
        </form>

        {/* News Items Grid */}
        <div className="mt-12">
          <h3 className="text-2xl font-semibold text-gray-800 mb-6">Recent News</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {newsItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 relative cursor-pointer"
                onClick={() => setSelectedNews(item)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNews(item.id, item.image_url);
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors duration-200 z-10"
                  title="Delete news item"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <h4 className="text-base font-semibold text-gray-800 mb-2">{item.title}</h4>
                  <p className="text-sm text-gray-500 mb-2">
                    {new Date(item.date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600 line-clamp-4">
                    {item.excerpt}
                  </p>
                  <button 
                    className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNews(item);
                    }}
                  >
                    Read More
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* News Item Popup */}
      {selectedNews && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedNews(null)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              {selectedNews.image_url && (
                <img
                  src={selectedNews.image_url}
                  alt={selectedNews.title}
                  className="w-full h-64 object-cover"
                />
              )}
              <button
                onClick={() => setSelectedNews(null)}
                className="absolute top-4 right-4 bg-white text-gray-800 rounded-full p-2 hover:bg-gray-100 transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedNews.title}</h3>
              <p className="text-gray-500 mb-4">{new Date(selectedNews.date).toLocaleDateString()}</p>
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{selectedNews.excerpt}</p>
              </div>
              {selectedNews.link && (
                <a
                  href={selectedNews.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Visit Full Article
                </a>
              )}
            </div>
          </div>
        </div>
      )}

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