import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

interface LiveUpdate {
  id: number
  title: string
  created_at: string
  link_to_news_id: number | null
  direct_link: string | null
}

const NewsTicker = () => {
  const [activeUpdate, setActiveUpdate] = useState<number | null>(null)
  const [updates, setUpdates] = useState<LiveUpdate[]>([])
  
  useEffect(() => {
    // Fetch live updates from Supabase
    const fetchLiveUpdates = async () => {
      const { data, error } = await supabase
        .from('live_updates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {
        console.error('Error fetching live updates:', error)
        return
      }

      setUpdates(data || [])
    }

    fetchLiveUpdates()

    // Set up real-time subscription
    const subscription = supabase
      .channel('live_updates_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_updates' }, () => {
        fetchLiveUpdates()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleUpdateClick = (update: LiveUpdate) => {
    if (update.link_to_news_id) {
      window.location.href = `/news/${update.link_to_news_id}`
    } else if (update.direct_link) {
      window.location.href = update.direct_link
    }
  }

  // Create multiple copies of updates to fill the space
  const getRepeatedUpdates = () => {
    if (updates.length === 0) return []
    
    // Create more copies for smoother animation
    const minRepeats = 20 // Increased number of repeats for smoother animation
    const repeatedUpdates = []
    
    for (let i = 0; i < minRepeats; i++) {
      repeatedUpdates.push(...updates)
    }
    
    return repeatedUpdates
  }

  const repeatedUpdates = getRepeatedUpdates()

  return (
    <div className="bg-blue-600 text-white py-3 shadow-lg relative z-10">
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
      
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center">
          <div className="bg-red-500 text-white px-4 py-1.5 rounded-full mb-2 md:mb-0 md:mr-4 font-bold whitespace-nowrap shadow-md hover:bg-red-600 transition-colors duration-300">
            LIVE UPDATES
          </div>
          <div className="overflow-hidden flex-1 w-full relative">
            <div className="flex whitespace-nowrap animate-scroll">
              {repeatedUpdates.map((update, index) => (
                <span 
                  key={`update-${update.id}-${index}`}
                  className={`inline-block mr-8 cursor-pointer transition-all duration-300 ${
                    (update.link_to_news_id || update.direct_link) 
                      ? 'hover:text-blue-100' 
                      : ''
                  }`}
                  onClick={() => handleUpdateClick(update)}
                >
                  {update.title}
                  {(update.link_to_news_id || update.direct_link) && (
                    <span className="ml-2 text-xs opacity-75">
                      (Click to view {update.link_to_news_id ? 'news' : 'link'})
                    </span>
                  )}
                  {" • "}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile touch indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-50 md:hidden"></div>

      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-scroll {
          animation: scroll 30s linear infinite;
          will-change: transform;
        }
        .animate-scroll:hover {
          animation-play-state: running;
        }
      `}</style>
    </div>
  )
}

export default NewsTicker 