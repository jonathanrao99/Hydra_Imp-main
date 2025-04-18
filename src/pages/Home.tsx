import React, { useState, useEffect, useRef } from 'react'
import ChiefMinisterSection from '../components/ChiefMinisterSection'
import PrincipalSecretarySection from '../components/PrincipalSecretarySection'
import CommissionerSection from '../components/CommissionerSection'
import { supabase } from '../supabaseClient'

interface LiveUpdate {
  id: number
  title: string
  created_at: string
  link_to_news_id: number | null
}

const Home = () => {
  const [activeSection, setActiveSection] = useState<'cm' | 'ps' | 'commissioner'>('cm')
  const [isPaused, setIsPaused] = useState(false)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const [liveUpdates, setLiveUpdates] = useState<LiveUpdate[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

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

      setLiveUpdates(data || [])
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

  useEffect(() => {
    if (isPaused) return

    const interval = setInterval(() => {
      setActiveSection(prev => {
        if (prev === 'cm') return 'ps'
        if (prev === 'ps') return 'commissioner'
        return 'cm'
      })
    }, 7000)

    return () => clearInterval(interval)
  }, [isPaused])

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 50) {
      // Swipe left
      setActiveSection(prev => {
        if (prev === 'cm') return 'ps'
        if (prev === 'ps') return 'commissioner'
        return 'cm'
      })
      setIsPaused(true)
    } else if (touchEnd - touchStart > 50) {
      // Swipe right
      setActiveSection(prev => {
        if (prev === 'commissioner') return 'ps'
        if (prev === 'ps') return 'cm'
        return 'commissioner'
      })
      setIsPaused(true)
    }
  }

  const handleClick = () => {
    setIsPaused(!isPaused)
  }

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveSection(prev => {
      if (prev === 'commissioner') return 'ps'
      if (prev === 'ps') return 'cm'
      return 'commissioner'
    })
    setIsPaused(true)
  }

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveSection(prev => {
      if (prev === 'cm') return 'ps'
      if (prev === 'ps') return 'commissioner'
      return 'cm'
    })
    setIsPaused(true)
  }

  return (
    <div className="relative">
      <div 
        className="relative overflow-hidden cursor-pointer"
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        ref={containerRef}
      >
        {/* Pause Indicator */}
        {isPaused && (
          <div className="absolute top-4 right-4 z-30 bg-white/80 text-blue-600 px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
            Paused
          </div>
        )}

        {/* Navigation Arrows */}
        <button
          onClick={handlePrev}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 bg-white/80 hover:bg-white text-blue-600 rounded-full p-2 shadow-lg transition-all duration-300 hover:scale-110"
          style={{ display: activeSection === 'cm' ? 'none' : 'block' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={handleNext}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 bg-white/80 hover:bg-white text-blue-600 rounded-full p-2 shadow-lg transition-all duration-300 hover:scale-110"
          style={{ display: activeSection === 'commissioner' ? 'none' : 'block' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Indicator Dots */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
          <div
            className={`w-3 h-3 rounded-full transition-colors duration-300 ${
              activeSection === 'cm' ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          />
          <div
            className={`w-3 h-3 rounded-full transition-colors duration-300 ${
              activeSection === 'ps' ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          />
          <div
            className={`w-3 h-3 rounded-full transition-colors duration-300 ${
              activeSection === 'commissioner' ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          />
        </div>

        {/* Live Updates Carousel */}
        <div className="absolute top-0 left-0 w-full bg-blue-600 text-white p-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-lg font-semibold mb-2">Live Updates</h2>
            <div className="overflow-x-auto whitespace-nowrap">
              {liveUpdates.map((update) => (
                <div
                  key={update.id}
                  className={`inline-block mr-4 p-2 rounded-lg ${
                    update.link_to_news_id 
                      ? 'bg-white/20 hover:bg-white/30 cursor-pointer' 
                      : 'bg-white/10'
                  }`}
                  onClick={(e) => {
                    if (update.link_to_news_id) {
                      e.stopPropagation()
                      // Navigate to the news item
                      window.location.href = `/news/${update.link_to_news_id}`
                    }
                  }}
                >
                  {update.title}
                  {update.link_to_news_id && (
                    <span className="ml-2 text-xs opacity-75">(Click to view news)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="relative h-screen">
          <div className={`absolute inset-0 transition-opacity duration-500 ${activeSection === 'cm' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <ChiefMinisterSection />
          </div>
          <div className={`absolute inset-0 transition-opacity duration-500 ${activeSection === 'ps' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <PrincipalSecretarySection />
          </div>
          <div className={`absolute inset-0 transition-opacity duration-500 ${activeSection === 'commissioner' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <CommissionerSection />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home