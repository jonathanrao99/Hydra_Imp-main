import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useMediaContent } from '../hooks/useMediaContent'

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
  const { mediaItems, loading, error } = useMediaContent('asset_protection')
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (mediaItems.length === 0) return

    // Only set up timer for images, not for videos
    if (mediaItems[currentSlide]?.file_type === 'image') {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % mediaItems.length)
      }, 3000)
      return () => clearInterval(timer)
    }
  }, [mediaItems.length, currentSlide, mediaItems])

  // Handle video completion
  const handleVideoEnd = () => {
    setCurrentSlide((prev) => (prev + 1) % mediaItems.length)
  }

  // Handle slide change
  useEffect(() => {
    if (mediaItems[currentSlide]?.file_type === 'video' && videoRef.current) {
      videoRef.current.play().catch(error => {
        console.log('Auto-play prevented:', error)
      })
    }
  }, [currentSlide, mediaItems])

  useEffect(() => {
    // Set up real-time subscription
    const subscription = supabase
      .channel('media_content_channel')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'media_content',
        filter: 'page_section=eq.asset_protection'
      }, () => {
        // The useMediaContent hook will automatically refetch
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

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
                ) : item.file_type === 'video' ? (
                  <video
                    ref={videoRef}
                    src={item.file_url}
                    controls
                    playsInline
                    autoPlay
                    muted
                    onEnded={handleVideoEnd}
                    className="absolute inset-0 w-full h-full object-contain bg-white"
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : null}
              </div>
              <div className="bg-white p-6 text-center">
                <p className="text-xl font-semibold text-blue-600 mb-1">{item.title}</p>
                {item.description && (
                  <p className="text-sm text-gray-600">{item.description}</p>
                )}
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