import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useMediaContent } from '../hooks/useMediaContent'

const DisasterResponseCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const { mediaItems, loading, error } = useMediaContent('disaster_response')

  useEffect(() => {
    if (mediaItems.length === 0) return

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % mediaItems.length)
    }, 2000)

    return () => clearInterval(timer)
  }, [mediaItems.length])

  useEffect(() => {
    // Set up real-time subscription
    const subscription = supabase
      .channel('media_content_channel')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'media_content',
        filter: 'page_section=eq.disaster_response'
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
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">Disaster Response in Action</h2>
      
      <div className="relative w-full max-w-4xl mx-auto">
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
                  alt={item.title || 'Disaster Response Image'}
                  className="absolute inset-0 w-full h-full object-contain bg-white"
                />
              ) : null}
            </div>
            <div className="text-center mt-4">
              {item.title && (
                <p className="text-xl font-semibold text-blue-600">{item.title}</p>
              )}
            </div>
          </div>
        ))}

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

export default DisasterResponseCarousel 