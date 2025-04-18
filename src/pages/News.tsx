import { useState, useEffect } from 'react'
import ImageModal from '@/components/ImageModal'
import { supabase } from '../supabaseClient'

interface NewsItem {
  id: number
  title: string
  date: string
  image_url: string
  excerpt: string
  link: string
}

const News = () => {
  const [selectedImage, setSelectedImage] = useState<{ image: string; title: string } | null>(null)
  const [newsItems, setNewsItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNews = async () => {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('date', { ascending: false })

      if (error) {
        console.error('Error fetching news:', error)
        return
      }

      setNewsItems(data || [])
      setLoading(false)
    }

    fetchNews()

    // Set up real-time subscription
    const subscription = supabase
      .channel('news_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news' }, () => {
        fetchNews()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading news...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">HYDRAA on News</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Stay updated with the latest news, announcements, and developments from the Hyderabad Disaster Response and Asset Protection Agency.
          </p>
        </div>

        {/* News Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {newsItems.map((news) => (
            <div key={news.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
              {/* News Image */}
              <div 
                className="aspect-video relative overflow-hidden cursor-pointer"
                onClick={() => setSelectedImage({ image: news.image_url, title: news.title })}
              >
                <img
                  src={news.image_url}
                  alt={news.title}
                  className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* News Content */}
              <div className="p-6">
                <div className="text-sm text-gray-500 mb-2">{news.date}</div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3 hover:text-blue-600 transition-colors duration-300">
                  {news.title}
                </h2>
                <p className="text-gray-600 mb-4">{news.excerpt}</p>
                <a
                  href={news.link}
                  className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-700 transition-colors duration-300"
                >
                  Read More
                  <svg
                    className="ml-2 w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Image Modal */}
        {selectedImage && (
          <ImageModal
            image={selectedImage.image}
            title={selectedImage.title}
            onClose={() => setSelectedImage(null)}
          />
        )}
      </div>
    </div>
  )
}

export default News 