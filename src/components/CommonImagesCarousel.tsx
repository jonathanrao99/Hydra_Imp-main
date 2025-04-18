import { useState, useEffect } from 'react'
import { useMediaContent } from '../hooks/useMediaContent'

interface CarouselProps {
  section: 'asset_protection' | 'disaster_response' | 'traffic_management' | 'advertisement'
  title?: string
}

const CommonImagesCarousel: React.FC<CarouselProps> = ({ section, title }) => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const { mediaItems, loading, error } = useMediaContent(section)

  useEffect(() => {
    if (mediaItems.length === 0) return

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % mediaItems.length)
    }, 2000)

    return () => clearInterval(timer)
  }, [mediaItems.length])

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-red-600 text-center">
          Error loading media content: {error}
        </div>
      </div>
    )
  }

  if (mediaItems.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {title && (
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">{title}</h2>
      )}
      
      <div className="relative w-full max-w-4xl mx-auto">
        <div className="overflow-hidden rounded-lg shadow-lg">
          {mediaItems.map((item, index) => (
            <div
              key={item.id}
              className={`transition-opacity duration-500 ${
                index === currentSlide ? 'opacity-100' : 'opacity-0 hidden'
              }`}
            >
              {item.file_type === 'image' ? (
                <img
                  src={item.file_url}
                  alt={item.title}
                  className="w-full h-auto max-h-[500px] object-cover"
                />
              ) : (
                <video
                  src={item.file_url}
                  className="w-full h-auto max-h-[500px] object-cover"
                  controls
                  muted
                  loop
                  playsInline
                />
              )}
              <div className="bg-gray-50 p-4 text-center">
                <p className="text-lg font-semibold text-blue-600">{item.title}</p>
                {item.description && (
                  <p className="text-gray-600 mt-2">{item.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Dots */}
        <div className="flex justify-center mt-3 space-x-2">
          {mediaItems.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                index === currentSlide ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default CommonImagesCarousel 