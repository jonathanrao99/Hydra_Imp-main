import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

interface MediaItem {
  id: string
  title: string
  file_url: string
  file_type: 'image' | 'video'
  description: string
  page_section: string
  created_at: string
}

const AssetProtectionCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMediaContent = async () => {
      try {
        const { data, error } = await supabase
          .from('media_content')
          .select('*')
          .eq('page_section', 'asset_protection')
          .order('created_at', { ascending: false })

        if (error) throw error
        setMediaItems(data || [])
      } catch (err) {
        console.error('Error fetching media content:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchMediaContent()
  }, [])

  useEffect(() => {
    if (mediaItems.length === 0) return

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % mediaItems.length)
    }, 2000)

    return () => clearInterval(timer)
  }, [mediaItems.length])

  if (loading) return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-center items-center h-[500px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    </div>
  )

  if (error) return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="text-red-600 text-center">{error}</div>
    </div>
  )

  if (mediaItems.length === 0) return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="text-gray-600 text-center">No media content available</div>
    </div>
  )

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      
      <div className="relative w-full max-w-5xl mx-auto">
        <div className="overflow-hidden rounded-lg shadow-lg">
          {mediaItems.map((item, index) => (
            <div
              key={item.id}
              className={`transition-opacity duration-500 ${
                index === currentSlide ? 'opacity-100' : 'opacity-0 hidden'
              }`}
            >
              <div className="aspect-[16/9] relative">
                {item.file_type === 'image' ? (
                  <img
                    src={item.file_url}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-contain bg-white"
                  />
                ) : null}
              </div>
              <div className="bg-white p-6 text-center">
                <p className="text-xl font-semibold text-blue-600">{item.title}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Dots */}
        <div className="flex justify-center mt-4 space-x-3">
          {mediaItems.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                index === currentSlide ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default AssetProtectionCarousel 